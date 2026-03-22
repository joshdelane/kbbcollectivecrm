'use client'

import { useState } from 'react'
import { ZapIcon, CopyIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

export default function ZapierPanel({
  webhookSecret,
  webhookUrl,
}: {
  webhookSecret: string
  webhookUrl: string
}) {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [open, setOpen] = useState(false)

  const copy = (text: string, which: 'url' | 'secret') => {
    navigator.clipboard.writeText(text)
    if (which === 'url') {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } else {
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    }
  }

  const exampleBody = JSON.stringify(
    {
      customer_name: 'Jane Smith',
      phone: '07700 900000',
      email: 'jane@example.com',
      enquiry_source: 'Facebook Ads',
      notes: 'Interested in full kitchen refit',
      rough_budget: 15000,
    },
    null,
    2
  )

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2A2F2D', backgroundColor: '#1E2422' }}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-none" style={{ backgroundColor: '#FF4A00' }}>
            <ZapIcon size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Zapier Integration</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>Automatically add leads from Facebook Ads, forms, and more</p>
          </div>
        </div>
        {open ? <ChevronUpIcon size={16} style={{ color: '#6B7280' }} /> : <ChevronDownIcon size={16} style={{ color: '#6B7280' }} />}
      </button>

      {/* Expandable body */}
      {open && (
        <div className="px-6 pb-6 space-y-5" style={{ borderTop: '1px solid #2A2F2D' }}>
          <p className="text-xs pt-4" style={{ color: '#9CA3AF' }}>
            Use these details in Zapier to automatically create a new enquiry in your board whenever a lead comes in.
          </p>

          {/* Webhook URL */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>Webhook URL</p>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ backgroundColor: '#161A18', border: '1px solid #2A2F2D' }}>
              <code className="text-xs flex-1 truncate" style={{ color: '#B89763' }}>{webhookUrl}</code>
              <button
                onClick={() => copy(webhookUrl, 'url')}
                className="flex-none flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors"
                style={{ backgroundColor: copiedUrl ? '#052E16' : '#252B28', color: copiedUrl ? '#4ADE80' : '#9CA3AF' }}
              >
                {copiedUrl ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                {copiedUrl ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Secret */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>Secret key</p>
            <p className="text-xs mb-1.5" style={{ color: '#4A5250' }}>Add this as a header in Zapier: <code style={{ color: '#9CA3AF' }}>Authorization: Bearer &lt;secret&gt;</code></p>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ backgroundColor: '#161A18', border: '1px solid #2A2F2D' }}>
              <code className="text-xs flex-1 font-mono tracking-wider truncate" style={{ color: '#9CA3AF' }}>{webhookSecret}</code>
              <button
                onClick={() => copy(webhookSecret, 'secret')}
                className="flex-none flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors"
                style={{ backgroundColor: copiedSecret ? '#052E16' : '#252B28', color: copiedSecret ? '#4ADE80' : '#9CA3AF' }}
              >
                {copiedSecret ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                {copiedSecret ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* How to set up */}
          <div className="rounded-lg p-4 space-y-2" style={{ backgroundColor: '#161A18', border: '1px solid #2A2F2D' }}>
            <p className="text-xs font-semibold text-white mb-2">How to set up in Zapier</p>
            {[
              'Create a new Zap and pick your trigger (e.g. Facebook Lead Ads)',
              'Add an action: Webhooks by Zapier → POST',
              'Paste the Webhook URL above into the URL field',
              'Set Header: Authorization = Bearer <your secret key>',
              'Set Payload Type to JSON and map the fields below',
            ].map((step, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="flex-none w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold mt-0.5"
                  style={{ backgroundColor: '#FF4A00', color: '#FFFFFF', fontSize: '9px' }}>
                  {i + 1}
                </span>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>{step}</p>
              </div>
            ))}
          </div>

          {/* Example payload */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>JSON fields you can send</p>
            <p className="text-xs mb-2" style={{ color: '#4A5250' }}>Only <code style={{ color: '#9CA3AF' }}>customer_name</code> is required. All others are optional.</p>
            <pre className="rounded-lg px-4 py-3 text-xs overflow-x-auto" style={{ backgroundColor: '#161A18', border: '1px solid #2A2F2D', color: '#9CA3AF' }}>
              {exampleBody}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
