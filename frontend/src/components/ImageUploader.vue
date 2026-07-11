<script setup lang="ts">
import { ref } from 'vue';
import { isGuest, request } from '../api';
import { showToast } from '../toast';

const props = withDefaults(defineProps<{
  category: 'knowledge' | 'mistake' | 'avatar';
  label?: string;
  disabled?: boolean;
  avatar?: boolean;
}>(), {
  label: '上传图片',
  disabled: false,
  avatar: false
});

const emit = defineEmits<{
  uploaded: [payload: { url: string; fileId: string; markdown: string }];
}>();

const input = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const guest = isGuest();

function openPicker() {
  if (guest || props.disabled || uploading.value) return;
  input.value?.click();
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'));
    reader.readAsDataURL(blob);
  });
}

async function compressImage(file: File): Promise<{ dataUrl: string; filename: string }> {
  if (!file.type.startsWith('image/')) throw new Error('请选择 JPG、PNG、WebP 等图片文件。');
  if (file.size > 12 * 1024 * 1024) throw new Error('原图不能超过 12 MB。');

  const objectUrl = URL.createObjectURL(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('浏览器无法读取该图片。'));
    element.src = objectUrl;
  });
  const maxSide = props.avatar ? 800 : 1800;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) { URL.revokeObjectURL(objectUrl); throw new Error('浏览器无法处理该图片。'); }
  ctx.drawImage(image, 0, 0, width, height);
  URL.revokeObjectURL(objectUrl);

  const mime = file.type === 'image/png' && file.size < 1.5 * 1024 * 1024 ? 'image/png' : 'image/webp';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('压缩图片失败')), mime, 0.9);
  });
  if (blob.size > 4 * 1024 * 1024) throw new Error('压缩后图片仍超过 4 MB，请裁剪后再上传。');
  const extension = mime === 'image/png' ? 'png' : 'webp';
  return { dataUrl: await readAsDataUrl(blob), filename: `${Date.now()}.${extension}` };
}

async function onChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;
  uploading.value = true;
  try {
    const compressed = await compressImage(file);
    const result = await request<{ url: string; fileId: string }>('/progress?resource=upload', {
      method: 'POST',
      body: JSON.stringify({
        category: props.category,
        filename: compressed.filename,
        data_url: compressed.dataUrl
      })
    });
    const markdown = `![图片说明](${result.url})`;
    emit('uploaded', { ...result, markdown });
    showToast('图片上传成功');
  } catch (error) {
    showToast(error instanceof Error ? error.message : '图片上传失败', 'error');
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="image-uploader">
    <input ref="input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden @change="onChange" />
    <button type="button" class="secondary image-upload-button" :disabled="guest || disabled || uploading" @click="openPicker">
      {{ uploading ? '上传中…' : label }}
    </button>
    <span class="muted small-text">{{ guest ? '游客模式不可上传' : (avatar ? '建议正方形，自动压缩' : '支持 JPG / PNG / WebP，自动压缩后插入 Markdown') }}</span>
  </div>
</template>
