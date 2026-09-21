// 通用封面图片上传控件（picture-card 风格）
// 复用于：门店封面、医生头像、文章封面、服务图标等只需"单张图"的字段。
//
// 行为规范：
// - 有值时显示当前图片（hover 显示"点击替换"遮罩），无值时显示 + 加号 + "上传封面" 文字。
// - beforeUpload 校验类型(jpg/png/webp/gif) 与大小(<5MB)；不通过直接拦截。
// - customRequest 调 uploadAsset()，成功后把返回的逻辑路径拼成 /media/{path} 写回 form。
// - form 中 cover 字段值是字符串 URL（与 seed 中 /media/assets/ai_store_1.png 风格一致），
//   前台 src={s.cover} 直接可用；同时素材库会新增一条对应记录（asset.py 自动落库）。
//
// Props：
// - value: 当前 URL（可选），onChange(url): 上传/清除后回调
// - category: 写入素材库的分类（如"门店"，会出现在 CMS→素材库分类筛选里）
// - label: 加号占位的提示文字（默认"上传封面"）
import { useState } from 'react'
import { message, Upload } from 'antd'
import type { UploadProps } from 'antd/es/upload'
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons'
import { uploadAsset, mediaUrl } from '../api/m3'

interface Props {
  value?: string
  onChange?: (v: string | undefined) => void
  category?: string
  label?: string
}

export default function CoverUploader({
  value,
  onChange,
  category = '通用',
  label = '上传封面',
}: Props) {
  const [loading, setLoading] = useState(false)

  const beforeUpload = (file: File) => {
    const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
    if (!isImage) {
      message.error('仅支持 JPG / PNG / WebP / GIF 格式')
      return Upload.LIST_IGNORE
    }
    const isLt5M = file.size / 1024 / 1024 < 5
    if (!isLt5M) {
      message.error('图片大小不能超过 5MB')
      return Upload.LIST_IGNORE
    }
    return true
  }

  const customRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options
    setLoading(true)
    try {
      const res = await uploadAsset(file as File, category)
      const url = `/media/${res.path}`
      onChange?.(url)
      onSuccess?.(res, file as any)
      message.success(`已上传：${res.original_name}`)
    } catch (e: any) {
      onError?.(e as any)
      message.error(e?.message || '上传失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(undefined)
    message.info('已移除封面')
  }

  return (
    <>
      <Upload
        name="file"
        listType="picture-card"
        className="cover-uploader"
        showUploadList={false}
        accept="image/*"
        beforeUpload={beforeUpload}
        customRequest={customRequest}
      >
        {value ? (
          <div className="cover-img-wrap" title="点击替换封面">
            <img src={mediaUrl(value)} alt="封面" className="cover-img" />
            <div className="cover-img-mask">
              <span>点击替换</span>
              <span className="cover-img-clear" onClick={handleClear} title="移除封面">
                移除
              </span>
            </div>
          </div>
        ) : (
          <div className="cover-add">
            {loading ? <LoadingOutlined /> : <PlusOutlined />}
            <div className="cover-add-text">{loading ? '上传中…' : label}</div>
          </div>
        )}
      </Upload>
      <style>{`
        .cover-uploader .ant-upload.ant-upload-select-picture-card {
          width: 120px;
          height: 120px;
          border-radius: 10px;
          background: #fafafa;
          border-color: #e5e7eb;
        }
        .cover-uploader .ant-upload.ant-upload-select-picture-card:hover {
          border-color: #FF7A45;
        }
        .cover-img-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 10px;
          overflow: hidden;
        }
        .cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .cover-img-mask {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #fff;
          font-size: 12px;
          background: rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.18s;
        }
        .cover-img-wrap:hover .cover-img-mask {
          opacity: 1;
        }
        .cover-img-clear {
          padding: 2px 8px;
          background: rgba(255, 255, 255, 0.18);
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
        }
        .cover-img-clear:hover {
          background: rgba(255, 77, 79, 0.85);
        }
        .cover-add {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #888;
          font-size: 14px;
        }
        .cover-add .anticon {
          font-size: 22px;
          color: #FF7A45;
        }
        .cover-add-text {
          margin-top: 8px;
          font-size: 12px;
        }
      `}</style>
    </>
  )
}
