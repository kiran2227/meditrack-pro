const Medicine = require('../models/Medicine');
const History = require('../models/History');

class MedicineController {
  static async getMedicines(req, res) {
    try {
      const medicines = await Medicine.findByUserId(req.user.userId);
      res.json({
        success: true,
        medicines
      });
    } catch (error) {
      console.error('Get medicines error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch medicines'
      });
    }
  }

  static async addMedicine(req, res) {
    try {
      const { name, dosage, frequency, medicineTime1, medicineTime2, medicineTime3, stock, refill_reminder, voice_alert_type } = req.body;

      if (!name || !dosage || !medicineTime1) {
        return res.status(400).json({
          success: false,
          message: 'Name, dosage and at least one time are required'
        });
      }

      // Handle multiple times based on frequency
      let times = [medicineTime1];
      if (frequency === 'twice' && medicineTime2) {
        times.push(medicineTime2);
      } else if (frequency === 'thrice' && medicineTime2 && medicineTime3) {
        times.push(medicineTime2, medicineTime3);
      }

      const medicineIds = [];
      
      // Create separate medicine entries for each time with SAME stock
      for (let i = 0; i < times.length; i++) {
        const time = times[i];
        
        const medicineId = await Medicine.create({
          user_id: req.user.userId,
          name: i === 0 ? name : `${name} (Time ${i + 1})`,
          dosage,
          time,
          frequency: frequency || 'once',
          stock: stock || 0,
          refill_reminder: refill_reminder || 0,
          voice_alert_type: voice_alert_type || 'default',
          status: 'pending'
        });

        medicineIds.push(medicineId);
      }

      res.status(201).json({
        success: true,
        message: `Medicine added successfully with ${times.length} reminder(s)`,
        medicineIds
      });

    } catch (error) {
      console.error('Add medicine error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add medicine'
      });
    }
  }

  static async markAsTaken(req, res) {
    try {
      const { medicineId } = req.params;
      const { notes } = req.body;

      const medicine = await Medicine.findById(medicineId);
      if (!medicine || medicine.user_id !== req.user.userId) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found'
        });
      }

      // Check if already taken today
      const today = new Date().toDateString();
      const recentHistory = await History.findTodayByMedicineId(medicineId);
      
      if (recentHistory.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Medicine already marked as taken today'
        });
      }

      // Get all medicine entries with the same base name (for multiple times)
      const baseName = medicine.name.replace(/ \(Time \d+\)$/, '');
      const allRelatedMedicines = await Medicine.findByBaseName(req.user.userId, baseName);

      // Update stock for ALL related medicines
      let newStock = medicine.stock;
      const dosageMatch = medicine.dosage.match(/(\d+)/);
      const dosageCount = dosageMatch ? parseInt(dosageMatch[1]) : 1;
      
      if (medicine.stock > 0) {
        newStock = Math.max(0, medicine.stock - dosageCount);
        
        // Update stock for ALL related medicines
        for (const relatedMed of allRelatedMedicines) {
          await Medicine.updateStock(relatedMed.id, newStock);
        }
      }

      // Update this medicine status
      await Medicine.updateStatus(medicineId, 'taken');

      // Add to history
      await History.create({
        user_id: req.user.userId,
        medicine_id: medicineId,
        medicine_name: medicine.name,
        dosage: medicine.dosage,
        scheduled_time: medicine.time,
        actual_time: new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false 
        }),
        status: 'taken',
        notes: notes || ''
      });

      // Check for low stock alert
      if (newStock <= medicine.refill_reminder && medicine.refill_reminder > 0) {
        console.log(`🔔 LOW STOCK ALERT: ${medicine.name} has ${newStock} doses left`);
      }

      res.json({
        success: true,
        message: 'Medicine marked as taken',
        newStock: newStock
      });

    } catch (error) {
      console.error('Mark as taken error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update medicine'
      });
    }
  }

  static async rescheduleMedicine(req, res) {
    try {
      const { medicineId } = req.params;
      const { remindInMinutes } = req.body;

      const medicine = await Medicine.findById(medicineId);
      if (!medicine || medicine.user_id !== req.user.userId) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found'
        });
      }

      // Add to history as rescheduled
      await History.create({
        user_id: req.user.userId,
        medicine_id: medicineId,
        medicine_name: medicine.name,
        dosage: medicine.dosage,
        scheduled_time: medicine.time,
        actual_time: null,
        status: 'rescheduled',
        notes: `Rescheduled for ${remindInMinutes} minutes later`
      });

      res.json({
        success: true,
        message: `Medicine will remind you again in ${remindInMinutes} minutes`
      });

    } catch (error) {
      console.error('Reschedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reschedule medicine'
      });
    }
  }
    
static async updateMedicine(req, res) {
  try {
    const { medicineId } = req.params;
    const { name, dosage, time, frequency, stock, refill_reminder, voice_alert_type } = req.body;

    const medicine = await Medicine.findById(medicineId);
    if (!medicine || medicine.user_id !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    const oldTime = medicine.time;
    const newTime = time || oldTime;

    // ✅ Perform update first
    await Medicine.update(medicineId, {
      name: name || medicine.name,
      dosage: dosage || medicine.dosage,
      time: newTime,
      frequency: frequency || medicine.frequency,
      stock: stock || medicine.stock,
      refill_reminder: refill_reminder || medicine.refill_reminder,
      voice_alert_type: voice_alert_type || medicine.voice_alert_type
    });

    // ✅ Parse HH:MM → Date for comparison
    const [newHour, newMinute] = newTime.split(':').map(Number);
    const now = new Date();
    const futureDate = new Date();
    futureDate.setHours(newHour, newMinute, 0, 0);

    const timeChanged = oldTime !== newTime;
    const movedToFuture = futureDate > now;

    // ✅ If edited to a later time and was already taken, reset
    if (medicine.status === 'taken' && (timeChanged || movedToFuture)) {
      const dosageMatch = (medicine.dosage || '').match(/(\d+)/);
      const dosageCount = dosageMatch ? parseInt(dosageMatch[1]) : 1;

      const restoredStock = medicine.stock + dosageCount;

      await Medicine.updateStatusAndStock(medicineId, 'pending', restoredStock);

      console.log(`🔁 Medicine "${medicine.name}" reset → pending, stock +${dosageCount}`);
    }

    res.json({
      success: true,
      message: 'Medicine updated successfully'
    });
  } catch (error) {
    console.error('Update medicine error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medicine'
    });
  }
}


  static async deleteMedicine(req, res) {
    try {
      const { medicineId } = req.params;

      const medicine = await Medicine.findById(medicineId);
      if (!medicine || medicine.user_id !== req.user.userId) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found'
        });
      }

      // Get base name to delete all related medicines
      const baseName = medicine.name.replace(/ \(Time \d+\)$/, '');
      const allRelatedMedicines = await Medicine.findByBaseName(req.user.userId, baseName);

      // Delete all related medicines
      for (const relatedMed of allRelatedMedicines) {
        await Medicine.delete(relatedMed.id);
      }

      res.json({
        success: true,
        message: 'Medicine and all related reminders deleted successfully'
      });

    } catch (error) {
      console.error('Delete medicine error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete medicine'
      });
    }
  }
}

module.exports = MedicineController;