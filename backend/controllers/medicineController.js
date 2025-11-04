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
      const { name, dosage, time, frequency, stock, refill_reminder, voice_alert_path } = req.body;

      if (!name || !dosage || !time) {
        return res.status(400).json({
          success: false,
          message: 'Name, dosage and time are required'
        });
      }

      const medicineId = await Medicine.create({
        user_id: req.user.userId,
        name,
        dosage,
        time,
        frequency: frequency || 'once',
        stock: stock || 0,
        refill_reminder: refill_reminder || 0,
        voice_alert_path: voice_alert_path || null
      });

      res.status(201).json({
        success: true,
        message: 'Medicine added successfully',
        medicineId
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

      await Medicine.updateTakenTime(medicineId);

      // Add to history
      await History.create({
        user_id: req.user.userId,
        medicine_id: medicineId,
        medicine_name: medicine.name,
        dosage: medicine.dosage,
        scheduled_time: medicine.time,
        actual_time: new Date(),
        status: 'taken',
        notes
      });

      res.json({
        success: true,
        message: 'Medicine marked as taken'
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

      await Medicine.delete(medicineId);

      res.json({
        success: true,
        message: 'Medicine deleted successfully'
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