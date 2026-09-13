import { Router } from 'express';
import {
  getProductsHandler,
  getProductByIdHandler,
  createProductHandler,
  updateProductHandler,
  updateStockHandler,
  syncProductHandler,
  deleteProductHandler,
} from './product.controller.js';

const router = Router();

router.get('/', getProductsHandler);
router.get('/:id', getProductByIdHandler);
router.post('/', createProductHandler);
router.put('/:id', updateProductHandler);
router.patch('/:id/stock', updateStockHandler);
router.post('/:id/sync', syncProductHandler);
router.delete('/:id', deleteProductHandler);

export default router;
