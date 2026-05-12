'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ImageIcon, VideoIcon, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Badge } from '@/_components/ui/badge'
import { Separator } from '@/_components/ui/separator'
import { ProductMediaGallery } from './product-media-gallery'
import { ProductMediaUpload } from './product-media-upload'
import type { ProductMediaDto } from '@/_data-access/product/get-product-media'
import {
  MAX_IMAGES_PER_PRODUCT,
  MAX_VIDEOS_PER_PRODUCT,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
} from '@/_lib/product-media-constants'

interface ProductMediaDialogProps {
  productId: string
  productName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductMediaDialog({
  productId,
  productName,
  open,
  onOpenChange,
}: ProductMediaDialogProps) {
  const router = useRouter()
  const [media, setMedia] = useState<ProductMediaDto[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const imageMedia = media.filter((item) => item.type === 'IMAGE')
  const videoMedia = media.filter((item) => item.type === 'VIDEO')
  const imageCount = imageMedia.length
  const videoCount = videoMedia.length

  const fetchMedia = useCallback(async () => {
    if (!productId) return
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/product-media/list?productId=${productId}`,
      )
      if (!response.ok) throw new Error('Falha ao carregar mídias.')
      const result = await response.json() as { media: ProductMediaDto[] }
      setMedia(result.media)
    } catch {
      // Silencia o erro — o usuário pode tentar fechar e abrir novamente
      setMedia([])
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  // Carrega as mídias ao abrir o dialog
  useEffect(() => {
    if (open) {
      void fetchMedia()
    } else {
      setMedia([])
    }
  }, [open, fetchMedia])

  const handleUploadComplete = () => {
    // Recarrega a lista de mídias e atualiza a tabela pai
    void fetchMedia()
    router.refresh()
  }

  const hasImages = imageCount > 0
  const hasVideos = videoCount > 0
  const hasAnyMedia = hasImages || hasVideos

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3 pr-6">
              <DialogTitle className="text-base leading-snug">
                Mídias de{' '}
                <span className="text-foreground">{productName}</span>
              </DialogTitle>
            </div>

            {/* Indicadores de limites */}
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  imageCount >= MAX_IMAGES_PER_PRODUCT
                    ? 'secondary'
                    : 'outline'
                }
                className="flex items-center gap-1.5 text-xs font-normal"
              >
                <ImageIcon className="h-3 w-3" />
                {imageCount}/{MAX_IMAGES_PER_PRODUCT} imagens
              </Badge>
              <Badge
                variant={
                  videoCount >= MAX_VIDEOS_PER_PRODUCT
                    ? 'secondary'
                    : 'outline'
                }
                className="flex items-center gap-1.5 text-xs font-normal"
              >
                <VideoIcon className="h-3 w-3" />
                {videoCount}/{MAX_VIDEOS_PER_PRODUCT} vídeo
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Seção de Imagens */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Imagens</p>
                <span className="text-xs text-muted-foreground">
                  ({imageCount}/{MAX_IMAGES_PER_PRODUCT})
                </span>
              </div>

              {hasImages && (
                <ProductMediaGallery
                  media={imageMedia}
                  productId={productId}
                  onUploadComplete={handleUploadComplete}
                />
              )}

              <ProductMediaUpload
                productId={productId}
                mediaType="IMAGE"
                currentCount={imageCount}
                maxCount={MAX_IMAGES_PER_PRODUCT}
                acceptedTypes={ACCEPTED_IMAGE_TYPES}
                maxSize={MAX_IMAGE_SIZE}
                onUploadComplete={handleUploadComplete}
              />
            </div>

            {/* Separador visual entre as seções */}
            {(hasAnyMedia ||
              imageCount < MAX_IMAGES_PER_PRODUCT ||
              videoCount < MAX_VIDEOS_PER_PRODUCT) && <Separator />}

            {/* Seção de Vídeo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <VideoIcon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Vídeo</p>
                <span className="text-xs text-muted-foreground">
                  ({videoCount}/{MAX_VIDEOS_PER_PRODUCT})
                </span>
              </div>

              {hasVideos && (
                <ProductMediaGallery
                  media={videoMedia}
                  productId={productId}
                  onUploadComplete={handleUploadComplete}
                />
              )}

              <ProductMediaUpload
                productId={productId}
                mediaType="VIDEO"
                currentCount={videoCount}
                maxCount={MAX_VIDEOS_PER_PRODUCT}
                acceptedTypes={ACCEPTED_VIDEO_TYPES}
                maxSize={MAX_VIDEO_SIZE}
                onUploadComplete={handleUploadComplete}
              />
            </div>

            {/* Empty state quando não há mídia alguma */}
            {!hasAnyMedia && !isLoading && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma mídia adicionada ainda. Faça upload de imagens ou
                vídeos acima.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
