/**
 * @jest-environment node
 */
import https from 'https'
import { IncomingMessage } from 'http'
import { ServerApi, createServer, httpsAgent } from '@open-draft/test-server'
import { createInterceptor } from '../../src'
import { interceptClientRequest } from '../../src/interceptors/ClientRequest'
import { getRequestOptionsByUrl } from '../../src/utils/getRequestOptionsByUrl'

let server: ServerApi

const interceptor = createInterceptor({
  modules: [interceptClientRequest],
  resolver(request) {
    if ([server.https.makeUrl('/get')].includes(request.url.href)) {
      return
    }

    return {
      status: 403,
      statusText: 'Forbidden',
      body: 'mocked-body',
    }
  },
})

beforeAll(async () => {
  server = await createServer((app) => {
    app.get('/get', (req, res) => {
      res.status(200).send('/').end()
    })
  })

  interceptor.apply()
})

afterEach(() => {
  jest.restoreAllMocks()
})

afterAll(async () => {
  interceptor.restore()
  await server.close()
})

test('calls a custom callback once when the request is bypassed', (done) => {
  let resBody: string = ''

  const customCallback = jest.fn<void, [IncomingMessage]>((res) => {
    res.on('data', (chunk) => (resBody += chunk))
    res.on('end', () => {
      // Check that the request was bypassed.
      expect(resBody).toEqual('/')

      // Custom callback to `https.get` must be called once.
      expect(customCallback).toBeCalledTimes(1)
      done()
    })
    res.on('error', done)
  })

  https
    .get(
      {
        ...getRequestOptionsByUrl(new URL(server.https.makeUrl('/get'))),
        agent: httpsAgent,
      },
      customCallback
    )
    .on('error', (error) => {
      console.log('some error', error)
    })
    .end()
})

test('calls a custom callback once when the response is mocked', (done) => {
  let resBody: string = ''

  const customCallback = jest.fn<void, [IncomingMessage]>((res) => {
    res.on('data', (chunk) => (resBody += chunk))
    res.on('end', () => {
      // Check that the response was mocked.
      expect(resBody).toEqual('mocked-body')

      // Custom callback to `https.get` must be called once.
      expect(customCallback).toBeCalledTimes(1)
      done()
    })
  })

  https
    .get(
      {
        ...getRequestOptionsByUrl(new URL(server.https.makeUrl('/arbitrary'))),
        agent: httpsAgent,
      },
      customCallback
    )
    .end()
})
