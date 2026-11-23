// Logger có cấu trúc (JSON, pino). Mức log theo môi trường: production info, development debug, test im lặng
// (đổi bằng LOG_LEVEL). Không bao giờ ghi bí mật / dữ liệu cá nhân:
// - redact: cookie, authorization, CSRF token, set-cookie, mọi body, các trường password/pin/code/token/secret…
// - email trong thông điệp và trường chuỗi bị che: c***@gmail.com
// - URL chỉ ghi đường dẫn (không query string – có thể chứa token, email tìm kiếm…)
const pino = require('pino');
const { maskEmail } = require('./utils/mask');

const { logLevel: level, env } = require('./config');

const REDACT = [
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  'req.body',
  '*.password',
  '*.pin',
  '*.code',
  '*.token',
  '*.secret',
  '*.passwordHash',
  '*.adminPinHash',
  '*.mfaSecret',
  '*.sessionSecret',
  '*.mongoUri',
];

/** Che email trong mọi giá trị chuỗi (đệ quy, giới hạn độ sâu). */
function maskDeep(v, depth = 0) {
  if (typeof v === 'string') return maskEmail(v);
  if (!v || typeof v !== 'object' || depth > 4) return v;
  if (v instanceof Error) return { type: v.name, message: maskEmail(v.message), stack: v.stack && maskEmail(v.stack) };
  const out = Array.isArray(v) ? [] : {};
  for (const [k, x] of Object.entries(v)) out[k] = maskDeep(x, depth + 1);
  return out;
}

/**
 * Tạo logger. stream: đích ghi (mặc định stdout) – test truyền stream riêng để kiểm tra nội dung.
 * @param {import('stream').Writable} [stream]
 * @param {string} [lvl]
 */
function createLogger(stream, lvl = level) {
  return pino(
    {
      level: lvl,
      base: { app: 'cnow', env },
      redact: { paths: REDACT, censor: '[đã ẩn]' },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }), log: (obj) => maskDeep(obj) },
      hooks: {
        logMethod(args, method) {
          method.apply(
            this,
            args.map((a) => (typeof a === 'string' ? maskEmail(a) : a)),
          );
        },
      },
      serializers: {
        err: (e) => maskDeep(pino.stdSerializers.err(e)),
        req: (req) => ({ id: req.id, method: req.method, path: String(req.url || '').split('?')[0], ip: req.remoteAddress }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    },
    stream,
  );
}

/**
 * Serializer cho pino-http (nhận object đã chuẩn hóa của pino: { id, method, url, query, headers, remoteAddress, raw }).
 * Chỉ giữ id, phương thức, ĐƯỜNG DẪN (bỏ query), IP – không header, không query.
 */
const httpSerializers = {
  req: (req) => ({ id: req.id, method: req.method, path: String(req.url || '').split('?')[0], ip: req.remoteAddress }),
  res: (res) => ({ statusCode: res.raw ? res.raw.statusCode : res.statusCode }),
};

const logger = createLogger();

module.exports = { logger, createLogger, httpSerializers };
