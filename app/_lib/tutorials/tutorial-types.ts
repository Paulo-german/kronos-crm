// Cada slide pode ter conteúdo de 3 tipos:
// - 'image': imagem estática ou GIF (next/image)
// - 'video': vídeo curto (HTML video ou embed)
// - 'component': componente React inline (ex: card de deal real)
export interface TutorialSlide {
  title: string
  description: string
  skippable?: boolean // se true, mostra botão "Pular" neste step
  content:
    | { type: 'image'; src: string } // /images/tutorials/{id}/{step}.webp
    | { type: 'video'; src: string } // URL do vídeo
    | { type: 'component'; componentId: string } // ID mapeado para componente React
}

export interface TutorialDefinition {
  id: string
  title: string
  description: string
  icon: string // lucide icon name
  category: 'getting_started' | 'advanced'
  slides: TutorialSlide[]
  relatedRoute: string // rota onde o trigger contextual aparece
  estimatedMinutes: number
}
