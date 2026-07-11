import tcb from '@cloudbase/node-sdk';

const allowedCategories = new Set(['knowledge', 'mistake', 'avatar']);
const allowedMime = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif']
]);

let app: ReturnType<typeof tcb.init> | undefined;

function cloudApp() {
  if (!app) {
    app = process.env.CLOUDBASE_ENV_ID ? tcb.init({ env: process.env.CLOUDBASE_ENV_ID }) : tcb.init();
  }
  return app;
}

function safeName(value: string) {
  return value.replace(/[^0-9a-zA-Z._-]/g, '_').slice(-100) || `${Date.now()}.webp`;
}

export async function uploadDataImage(input: { dataUrl: string; filename: string; category: string; userId: string }) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(input.dataUrl);
  if (!match) throw new Error('图片数据格式不正确。');
  const mime = match[1].toLowerCase();
  const ext = allowedMime.get(mime);
  if (!ext) throw new Error('仅支持 JPG、PNG、WebP 和 GIF 图片。');
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length || buffer.length > 4 * 1024 * 1024) throw new Error('图片大小必须在 4 MB 以内。');

  const category = allowedCategories.has(input.category) ? input.category : 'misc';
  const date = new Date();
  const datePath = `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  const base = safeName(input.filename).replace(/\.[^.]+$/, '');
  const cloudPath = `math-wiki/${input.userId}/${category}/${datePath}/${Date.now()}-${base}.${ext}`;
  const upload = await cloudApp().uploadFile({ cloudPath, fileContent: buffer });
  if (!upload?.fileID) throw new Error('云存储没有返回文件 ID。');

  const domain = String(process.env.CLOUDBASE_STORAGE_DOMAIN || '').replace(/\/$/, '');
  if (domain) return { fileId: upload.fileID, url: `${domain}/${cloudPath}`, cloudPath };

  const temp = await cloudApp().getTempFileURL({ fileList: [{ fileID: upload.fileID, maxAge: 315360000 }] });
  const url = temp?.fileList?.[0]?.tempFileURL;
  if (!url) throw new Error('图片已上传，但无法生成访问地址。请配置 CLOUDBASE_STORAGE_DOMAIN。');
  return { fileId: upload.fileID, url, cloudPath };
}
