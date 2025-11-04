const express = require('express');
const MedicineController = require('../controllers/medicineController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', MedicineController.getMedicines);
router.post('/', MedicineController.addMedicine);
router.post('/:medicineId/taken', MedicineController.markAsTaken);
router.post('/:medicineId/reschedule', MedicineController.rescheduleMedicine);
router.delete('/:medicineId', MedicineController.deleteMedicine);

module.exports = router;