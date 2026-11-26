import { z } from 'zod'

export const documentFile = z.custom<File>((value) => value instanceof File, '파일을 선택해 주세요.')
  .refine((file) => !file || (file.size > 0 && file.size <= 10 * 1024 * 1024), '파일 크기는 1바이트 이상 10 MiB 이하여야 합니다.')
  .refine((file) => !file || /\.(pdf|docx|txt)$/i.test(file.name), 'PDF, DOCX 또는 TXT 파일을 선택해 주세요.')
