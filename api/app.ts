/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDb } from './db/index.js'
import authRoutes from './routes/auth.js'
import boardingRouter from './routes/boarding.js'
import groomingRouter from './routes/grooming.js'
import careRouter from './routes/care.js'
import checkoutRouter from './routes/checkout.js'
import statisticsRouter from './routes/statistics.js'
import customersRouter from './routes/customers.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * Initialize database
 */
initDb()

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/boarding', boardingRouter)
app.use('/api/grooming', groomingRouter)
app.use('/api/care', careRouter)
app.use('/api/checkout', checkoutRouter)
app.use('/api/statistics', statisticsRouter)
app.use('/api/customers', customersRouter)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
