/**
 * @jest-environment node
 */
import got from 'got'
import { ServerApi, createServer } from '@open-draft/test-server'
import { RequestInterceptor } from '../../src'
import withDefaultInterceptors from '../../src/presets/default'

let interceptor: RequestInterceptor
let server: ServerApi

beforeAll(async () => {
  server = await createServer((app) => {
    app.get('/user', (req, res) => {
      console.log('[app] /user')
      return res.status(200).json({ id: 1 })
    })
  })

  interceptor = new RequestInterceptor(withDefaultInterceptors)
  interceptor.use((req) => {
    if (req.url.toString() === server.http.makeUrl('/test')) {
      return {
        status: 200,
        body: 'mocked-body',
      }
    }
  })
})

afterAll(async () => {
  interceptor.restore()
  await server.close()
})

test('mocks response to a request made with "got"', async () => {
  const res = await got(server.http.makeUrl('/test'))

  expect(res.statusCode).toBe(200)
  expect(res.body).toBe('mocked-body')
})

test.only('bypasses an unhandled request made with "got"', async () => {
  const res = await got(server.http.makeUrl('/user'))

  expect(res.statusCode).toBe(200)
  // expect(res.body).toEqual({ id: 1 })
})
