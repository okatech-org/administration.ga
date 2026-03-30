---
name: "LiveKit Realtime"
description: "Intégration vidéo/audio temps réel avec LiveKit, gestion salons, enregistrement, chat et monitoring"
activation: "livekit, video, audio, realtime, room, recording, streaming, participant, screen share"
projects: ["consulat.ga", "gabon-diplomatie", "digitalium.io", "evenement.ga"]
---

# LiveKit Real-time Video/Audio Integration

Skill complet pour intégrer LiveKit dans l'ecosysteme OkaTech. Couvre création salons, gestion participants, enregistrement, et chat temps réel.

## Installation et Configuration

### Dépendances

```bash
npm install livekit-client @livekit/components-react @livekit/components-styles
```

### Variables d'environnement

```env
# Public URL du serveur LiveKit
VITE_LIVEKIT_URL=wss://your-livekit-server.com
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com

# API Key (secret, backend only)
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Admin URL (optionnel, pour webhooks)
LIVEKIT_WEBHOOK_SECRET=webhook_secret
```

### Initialisation LiveKit

```typescript
// lib/livekit-config.ts
import { AccessToken } from 'livekit-server-sdk'

export function createAccessToken(
  roomName: string,
  participantName: string,
  metadata?: Record<string, any>
): string {
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  )

  at.identity = participantName
  at.name = participantName
  if (metadata) {
    at.metadata = JSON.stringify(metadata)
  }

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  })

  return at.toJwt()
}

export const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || ''
```

## Salons et Tokens

### Créer un token d'accès au salon (Backend)

**Convex:**

```typescript
// convex/livekit.ts
import { v } from 'convex/values'
import { authQuery, authMutation } from '@/lib/customFunctions'
import { AccessToken } from 'livekit-server-sdk'

export const generateRoomToken = authMutation({
  args: {
    roomName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Non authentifié')

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    )

    at.identity = user.id
    at.name = user.name || user.email
    at.metadata = JSON.stringify({
      userId: user.id,
      email: user.email,
      avatar: user.pictureUrl,
    })

    // Permissions
    at.addGrant({
      room: args.roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
    })

    // Sauvegarder la session de salon
    const session = await ctx.db.insert('livekitSessions', {
      roomName: args.roomName,
      userId: user.id,
      participantName: user.name || user.email,
      status: 'joining',
      joinedAt: new Date().toISOString(),
      metadata: {
        userId: user.id,
        email: user.email,
      },
    })

    return {
      token: at.toJwt(),
      url: process.env.LIVEKIT_URL,
      roomName: args.roomName,
      sessionId: session,
    }
  },
})

export const getRoomParticipants = authQuery({
  args: {
    roomName: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('livekitSessions')
      .filter((q) => q.eq(q.field('roomName'), args.roomName))
      .collect()

    return sessions.map((s) => ({
      participantName: s.participantName,
      userId: s.userId,
      status: s.status,
      joinedAt: s.joinedAt,
    }))
  },
})

export const updateSessionStatus = authMutation({
  args: {
    roomName: v.string(),
    status: v.union(v.literal('joining'), v.literal('active'), v.literal('left')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Non authentifié')

    const session = await ctx.db
      .query('livekitSessions')
      .filter(
        (q) =>
          q.and(
            q.eq(q.field('roomName'), args.roomName),
            q.eq(q.field('userId'), user.id)
          )
      )
      .first()

    if (session) {
      await ctx.db.patch(session._id, {
        status: args.status,
        ...(args.status === 'left' && {
          leftAt: new Date().toISOString(),
        }),
      })
    }

    return { success: true }
  },
})
```

**Express:**

```typescript
// routes/livekit.ts
import express from 'express'
import { AccessToken } from 'livekit-server-sdk'
import { requireAuth } from '@/middleware/auth'

const router = express.Router()

router.post('/generate-token', requireAuth, (req, res) => {
  const { roomName } = req.body
  const userId = req.user.id

  try {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    )

    at.identity = userId
    at.name = req.user.name || req.user.email
    at.metadata = JSON.stringify({
      userId,
      email: req.user.email,
    })

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    })

    res.json({
      token: at.toJwt(),
      url: process.env.LIVEKIT_URL,
    })
  } catch (error) {
    res.status(500).json({ error: 'Token generation failed' })
  }
})

export default router
```

## Provider et Composants LiveKit

### Provider d'Application

```typescript
// src/providers/LiveKitProvider.tsx
import {
  LiveKitRoom,
  VideoConference,
  PreJoin,
  LogLevel,
} from '@livekit/components-react'
import '@livekit/components-styles'
import type { ReactNode } from 'react'

interface LiveKitProviderProps {
  children: ReactNode
  token?: string
  serverUrl?: string
  roomName?: string
}

export function LiveKitProvider({
  children,
  token,
  serverUrl,
  roomName,
}: LiveKitProviderProps) {
  if (!token || !serverUrl || !roomName) {
    return <>{children}</>
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      data-lk-theme="light"
      onConnected={() => console.log('Connecté à LiveKit')}
      onDisconnected={() => console.log('Déconnecté de LiveKit')}
      onEncryptionError={(error) =>
        console.error('Erreur chiffrement:', error)
      }
    >
      {children}
    </LiveKitRoom>
  )
}
```

### Composant Salle Vidéo

```tsx
// src/components/video/VideoRoom.tsx
import { useEffect, useState } from 'react'
import {
  LiveKitRoom,
  VideoConference,
  PreJoin,
  RoomAudioRenderer,
} from '@livekit/components-react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Loader2 } from 'lucide-react'

interface VideoRoomProps {
  roomName: string
  onExit?: () => void
}

export function VideoRoom({ roomName, onExit }: VideoRoomProps) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPreJoin, setShowPreJoin] = useState(true)
  const [userName, setUserName] = useState('')

  const generateToken = useMutation(api.livekit.generateRoomToken)

  useEffect(() => {
    const initRoom = async () => {
      try {
        const { token: newToken } = await generateToken({ roomName })
        setToken(newToken)
        setLoading(false)
      } catch (error) {
        console.error('Erreur génération token:', error)
        setLoading(false)
      }
    }

    initRoom()
  }, [roomName, generateToken])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-600">Impossible de rejoindre le salon</p>
      </div>
    )
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={process.env.REACT_APP_LIVEKIT_URL}
      onDisconnected={onExit}
      className="h-screen"
    >
      {showPreJoin ? (
        <PreJoin
          onError={(error) => console.error('PreJoin error:', error)}
          onSubmit={() => setShowPreJoin(false)}
          validateUsername={(name) => name.length > 0}
          defaults={{
            username: userName,
            videoEnabled: true,
            audioEnabled: true,
          }}
        />
      ) : (
        <>
          <VideoConference />
          <RoomAudioRenderer />
        </>
      )}
    </LiveKitRoom>
  )
}
```

### Composant Aperçu Participant

```tsx
// src/components/video/ParticipantCard.tsx
import {
  Participant,
  ParticipantName,
  TrackToggle,
  useTracks,
  VideoTrack,
  AudioTrack,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { Mic, MicOff, Video, VideoOff } from 'lucide-react'

interface ParticipantCardProps {
  participant: Participant
}

export function ParticipantCard({ participant }: ParticipantCardProps) {
  const videoTrack = useTracks([Track.Source.Camera])?.[0]
  const audioTrack = useTracks([Track.Source.Microphone])?.[0]

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-900 h-64">
      <div className="absolute top-2 left-2 z-10">
        <div className="bg-black bg-opacity-70 px-2 py-1 rounded text-white text-sm">
          <ParticipantName />
        </div>
      </div>

      <VideoTrack
        participant={participant}
        source={Track.Source.Camera}
        className="w-full h-full object-cover"
      />

      <AudioTrack participant={participant} />

      <div className="absolute bottom-2 right-2 space-x-1">
        {audioTrack && (
          <TrackToggle
            source={Track.Source.Microphone}
            showLabel={false}
            className="bg-gray-700 hover:bg-gray-600 rounded-full p-2 text-white"
          >
            <Mic className="h-4 w-4" />
          </TrackToggle>
        )}

        {videoTrack && (
          <TrackToggle
            source={Track.Source.Camera}
            showLabel={false}
            className="bg-gray-700 hover:bg-gray-600 rounded-full p-2 text-white"
          >
            <Video className="h-4 w-4" />
          </TrackToggle>
        )}
      </div>
    </div>
  )
}
```

## Partage d'écran

### Composant Screen Share

```tsx
// src/components/video/ScreenShareButton.tsx
import { useState } from 'react'
import {
  useLocalParticipant,
  ScreenShareToggle,
  useLocalTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { Button } from '@/components/ui/button'
import { Monitor, MonitorOff } from 'lucide-react'

export function ScreenShareButton() {
  const { localParticipant } = useLocalParticipant()
  const tracks = useLocalTracks([Track.Source.ScreenShare])

  const isSharing = tracks.length > 0

  return (
    <ScreenShareToggle
      asChild
      trackSource={Track.Source.ScreenShare}
    >
      <Button
        variant={isSharing ? 'default' : 'outline'}
        className="gap-2"
      >
        {isSharing ? (
          <>
            <MonitorOff className="h-4 w-4" />
            Arrêter partage
          </>
        ) : (
          <>
            <Monitor className="h-4 w-4" />
            Partager écran
          </>
        )}
      </Button>
    </ScreenShareToggle>
  )
}
```

## Chat via DataChannel

### Store Chat avec Zustand

```typescript
// lib/chat-store.ts
import { create } from 'zustand'

export interface ChatMessage {
  id: string
  sender: string
  senderId: string
  content: string
  timestamp: Date
  type: 'text' | 'system'
}

interface ChatStore {
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  clearMessages: () => set({ messages: [] }),
}))
```

### Composant Chat

```tsx
// src/components/video/ChatPanel.tsx
import { useState, useEffect, useRef } from 'react'
import {
  useDataChannel,
  useLocalParticipant,
} from '@livekit/components-react'
import { useChatStore } from '@/lib/chat-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, X } from 'lucide-react'

interface ChatPanelProps {
  onClose?: () => void
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [messageText, setMessageText] = useState('')
  const { messages, addMessage } = useChatStore()
  const { localParticipant } = useLocalParticipant()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { message } = useDataChannel('chat', {
    onMessage: (msg) => {
      if (typeof msg.data === 'string') {
        try {
          const parsed = JSON.parse(msg.data)
          addMessage({
            id: Math.random().toString(),
            sender: msg.from?.name || 'Anonyme',
            senderId: msg.from?.identity || '',
            content: parsed.text,
            timestamp: new Date(),
            type: 'text',
          })
        } catch (e) {
          console.error('Erreur parsing message:', e)
        }
      }
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!messageText.trim() || !message) return

    // Envoyer via DataChannel
    message(
      JSON.stringify({
        text: messageText,
      })
    )

    // Ajouter localement
    addMessage({
      id: Math.random().toString(),
      sender: localParticipant?.name || 'Vous',
      senderId: localParticipant?.identity || '',
      content: messageText,
      timestamp: new Date(),
      type: 'text',
    })

    setMessageText('')
  }

  return (
    <div className="flex flex-col h-96 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="font-semibold">Chat</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm ${
              msg.type === 'system'
                ? 'text-center text-gray-500 italic'
                : 'text-gray-900'
            }`}
          >
            {msg.type === 'text' && (
              <>
                <span className="font-semibold text-blue-600">
                  {msg.sender}:
                </span>{' '}
                <span>{msg.content}</span>
              </>
            )}
            {msg.type === 'system' && <span>{msg.content}</span>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 flex gap-2">
        <Input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage()
          }}
          placeholder="Votre message..."
          className="flex-1"
        />
        <Button onClick={sendMessage} size="sm" className="gap-2">
          <Send className="h-4 w-4" />
          Envoyer
        </Button>
      </div>
    </div>
  )
}
```

## Enregistrement

### Configuration enregistrement serveur

LiveKit peut enregistrer nativement. Pour configurer:

```typescript
// Activer enregistrement dans config LiveKit:
// recordingsConfig:
//   enabled: true
//   storageBackend:
//     type: 's3'
//     s3:
//       bucket: 'your-bucket'
//       accessKey: 'YOUR_ACCESS_KEY'
//       secret: 'YOUR_SECRET_KEY'

// Déclencher enregistrement via API:
export const startRecording = authMutation({
  args: {
    roomName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Non authentifié')

    // Utiliser LiveKit API
    const response = await fetch(
      `${process.env.LIVEKIT_URL}/api/rooms/${args.roomName}/recordings/start`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${createAccessToken(
            args.roomName,
            'recorder'
          )}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to start recording')
    }

    const data = await response.json()
    return { recordingId: data.recordingId }
  },
})
```

## Webhooks LiveKit

### Traiter événements webhook

```typescript
// convex/webhooks.ts
import { httpAction } from './_generated/server'
import { v } from 'convex/values'

export const handleLiveKitWebhook = httpAction(
  v.object({ body: v.bytes(), headers: v.object({}) }),
  async (ctx, args) => {
    const body = new TextDecoder().decode(args.body)
    const event = JSON.parse(body)

    try {
      switch (event.event) {
        case 'room_finished':
          // Salle fermée
          console.log('Salle fermée:', event.room.name)
          break

        case 'participant_joined':
          // Participant rejoint
          const participant = event.participant
          console.log(`${participant.name} a rejoint`)

          // Mettre à jour base
          const sessions = await ctx.db
            .query('livekitSessions')
            .filter(
              (q) =>
                q.and(
                  q.eq(q.field('roomName'), event.room.name),
                  q.eq(q.field('userId'), participant.identity)
                )
            )
            .collect()

          if (sessions.length > 0) {
            await ctx.db.patch(sessions[0]._id, {
              status: 'active',
            })
          }
          break

        case 'participant_left':
          // Participant parti
          console.log(`${event.participant.name} a quitté`)

          const leftSessions = await ctx.db
            .query('livekitSessions')
            .filter(
              (q) =>
                q.and(
                  q.eq(q.field('roomName'), event.room.name),
                  q.eq(q.field('userId'), event.participant.identity)
                )
            )
            .collect()

          if (leftSessions.length > 0) {
            await ctx.db.patch(leftSessions[0]._id, {
              status: 'left',
              leftAt: new Date().toISOString(),
            })
          }
          break

        case 'track_published':
          // Track publié
          console.log('Track publié:', event.track.type)
          break

        case 'recording_started':
          // Enregistrement commencé
          console.log('Enregistrement commencé')
          break

        case 'recording_finished':
          // Enregistrement terminé
          console.log('Enregistrement terminé')
          await ctx.db.insert('recordings', {
            recordingId: event.recordingId,
            roomName: event.room.name,
            location: event.location,
            duration: event.duration,
            finishedAt: new Date().toISOString(),
          })
          break
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    } catch (error) {
      console.error('Webhook error:', error)
      return new Response(
        JSON.stringify({ error: 'Webhook processing failed' }),
        { status: 500 }
      )
    }
  }
)
```

## Monitoring Qualité Connexion

```tsx
// src/components/video/ConnectionQuality.tsx
import { useConnectionQuality } from '@livekit/components-react'
import { ConnectionQuality as LKConnectionQuality } from 'livekit-client'

export function ConnectionQuality() {
  const quality = useConnectionQuality()

  const getQualityLabel = () => {
    switch (quality) {
      case LKConnectionQuality.Excellent:
        return { label: 'Excellent', color: 'text-green-600' }
      case LKConnectionQuality.Good:
        return { label: 'Bon', color: 'text-blue-600' }
      case LKConnectionQuality.Poor:
        return { label: 'Médiocre', color: 'text-yellow-600' }
      case LKConnectionQuality.Lost:
        return { label: 'Perdue', color: 'text-red-600' }
      default:
        return { label: 'Inconnu', color: 'text-gray-600' }
    }
  }

  const { label, color } = getQualityLabel()

  return (
    <div className={`text-xs font-semibold ${color}`}>
      Connexion: {label}
    </div>
  )
}
```

### Statistiques détaillées

```tsx
// src/components/video/ConnectionStats.tsx
import { useEffect, useState } from 'react'
import { useLocalParticipant, useRoom } from '@livekit/components-react'

interface Stats {
  videoBitrate: number
  audioBitrate: number
  latency: number
  packetLoss: number
}

export function ConnectionStats() {
  const { localParticipant } = useLocalParticipant()
  const { room } = useRoom()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      if (!room) return

      room.engine.stats.then((engineStats) => {
        if (!engineStats) return

        // Extraire stats
        let videoBitrate = 0
        let audioBitrate = 0
        let latency = 0
        let packetLoss = 0

        engineStats.publishers.forEach((pub) => {
          pub.tracks.forEach((track) => {
            if (track.kind === 'video') {
              videoBitrate = track.bitrate || 0
            } else if (track.kind === 'audio') {
              audioBitrate = track.bitrate || 0
            }
          })
        })

        setStats({
          videoBitrate,
          audioBitrate,
          latency,
          packetLoss,
        })
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [room])

  if (!stats) return null

  return (
    <div className="text-xs text-gray-600 space-y-1">
      <div>Vidéo: {(stats.videoBitrate / 1000).toFixed(1)} kbps</div>
      <div>Audio: {(stats.audioBitrate / 1000).toFixed(1)} kbps</div>
      <div>Latence: {stats.latency}ms</div>
      <div>Perte paquets: {stats.packetLoss}%</div>
    </div>
  )
}
```

## Layouts Responsif

### Grid Layout

```tsx
// src/components/video/GridLayout.tsx
import { Participant, useTracks } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { ParticipantCard } from './ParticipantCard'

interface GridLayoutProps {
  participants: Participant[]
}

export function GridLayout({ participants }: GridLayoutProps) {
  const getCols = (count: number) => {
    if (count <= 1) return 'grid-cols-1'
    if (count <= 2) return 'grid-cols-2'
    if (count <= 4) return 'grid-cols-2 md:grid-cols-2'
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  }

  return (
    <div
      className={`grid gap-4 p-4 ${getCols(
        participants.length
      )}`}
    >
      {participants.map((participant) => (
        <ParticipantCard
          key={participant.identity}
          participant={participant}
        />
      ))}
    </div>
  )
}
```

### Speaker Layout

```tsx
// src/components/video/SpeakerLayout.tsx
import {
  Participant,
  useTracks,
  TrackPublication,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { ParticipantCard } from './ParticipantCard'

interface SpeakerLayoutProps {
  participants: Participant[]
  speakers: Participant[]
}

export function SpeakerLayout({ participants, speakers }: SpeakerLayoutProps) {
  const currentSpeaker = speakers[0] || participants[0]
  const others = participants.filter((p) => p !== currentSpeaker)

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {currentSpeaker && (
        <div className="flex-1">
          <ParticipantCard participant={currentSpeaker} />
        </div>
      )}

      {others.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {others.map((participant) => (
            <div key={participant.identity} className="w-24 h-24 flex-shrink-0">
              <ParticipantCard participant={participant} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

## Gestion Métadonnées Participant

```typescript
// lib/participant-metadata.ts
export interface ParticipantMetadata {
  userId: string
  email: string
  avatar?: string
  role?: 'host' | 'presenter' | 'attendee'
  status?: 'active' | 'idle' | 'away'
}

export function parseParticipantMetadata(
  metadata: string
): ParticipantMetadata {
  try {
    return JSON.parse(metadata)
  } catch {
    return {
      userId: '',
      email: '',
    }
  }
}

// Mettre à jour métadonnées
export async function updateParticipantMetadata(
  participant: Participant,
  metadata: Partial<ParticipantMetadata>
) {
  const current = parseParticipantMetadata(
    participant.metadata || '{}'
  )
  const updated = { ...current, ...metadata }

  // LiveKit autorise la mise à jour via LocalParticipant
  await participant.setMetadata(JSON.stringify(updated))
}
```

## Anti-patterns à éviter

```typescript
// ❌ JAMAIS exposer URL serveur LiveKit publiquement
// (Elle doit être sécurisée, pas accessible directement)

// ❌ JAMAIS créer tokens côté client
const token = createAccessToken(roomName, userName) // DANGEREUX!

// ✅ À faire : créer tokens côté serveur seulement
const { token } = await generateRoomToken({ roomName })

// ❌ JAMAIS faire confiance aux permissions du client
at.addGrant({
  room: userInputRoomName, // Vérifier que l'utilisateur peut accéder
})

// ✅ À faire : valider les accès côté serveur
const permission = await checkUserRoomAccess(userId, roomName)
if (!permission) throw new Error('Accès refusé')

// ❌ JAMAIS ignorer les erreurs de connexion
try {
  await room.connect()
} catch (e) {
  console.log(e) // Pas assez!
}

// ✅ À faire : implémenter retry logic
async function connectWithRetry(maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await room.connect()
      return
    } catch (e) {
      if (i === maxAttempts - 1) throw e
      await sleep(1000 * Math.pow(2, i))
    }
  }
}
```

## Tests

```typescript
// tests/livekit.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { AccessToken } from 'livekit-server-sdk'

describe('LiveKit Integration', () => {
  it('devrait créer un token valide', () => {
    const at = new AccessToken('api_key', 'api_secret')

    at.identity = 'user123'
    at.name = 'John Doe'

    at.addGrant({
      room: 'test-room',
      roomJoin: true,
      canPublish: true,
    })

    const token = at.toJwt()
    expect(token).toBeDefined()
    expect(token.split('.').length).toBe(3) // JWT format
  })

  it('devrait valider les permissions', () => {
    const at = new AccessToken('api_key', 'api_secret')

    at.addGrant({
      room: 'restricted-room',
      roomJoin: true,
      canPublish: false, // Participant restreint
    })

    const token = at.toJwt()
    expect(token).toBeDefined()
  })
})
```

## Configuration LiveKit serveur (Docker)

```yaml
# docker-compose.yml
version: '3.8'

services:
  livekit:
    image: livekit/livekit-server:latest
    ports:
      - '7880:7880'
      - '7881:7881'
      - '7882:7882'
    environment:
      RTC_PORT: '7882'
      BIND_ADDRESSES: '0.0.0.0'
      WEBHOOK_API_KEY: ${LIVEKIT_API_KEY}
      WEBHOOK_API_SECRET: ${LIVEKIT_API_SECRET}
      WEBHOOK_URL: https://your-domain.com/api/webhooks/livekit
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
```

## Ressources

- [LiveKit Documentation](https://docs.livekit.io)
- [LiveKit React Components](https://docs.livekit.io/realtime/build/react/)
- [LiveKit Server SDK](https://github.com/livekit/server-sdk-js)
- [Connection Quality Guide](https://docs.livekit.io/realtime/build/connection-quality/)
- [Recording Setup](https://docs.livekit.io/realtime/build/recording/)
