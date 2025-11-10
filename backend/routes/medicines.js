const express = require('express');
const MedicineController = require('../controllers/medicineController');
const router = express.Router();

// ✅ Non-JWT version — no auth middleware, just User-ID header
router.get('/', MedicineController.getMedicines);
router.post('/', MedicineController.addMedicine);
router.post('/:medicineId/taken', MedicineController.markAsTaken);
router.post('/:medicineId/reschedule', MedicineController.rescheduleMedicine);
router.delete('/:medicineId', MedicineController.deleteMedicine);
router.put('/:medicineId', authMiddleware, MedicineController.updateMedicine);

module.exports = router;
