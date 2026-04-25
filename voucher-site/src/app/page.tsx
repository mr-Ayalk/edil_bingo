'use client'

import { useState } from 'react'

export default function Home() {
  const [amount, setAmount] = useState('')
  const [voucher, setVoucher] = useState('')
  const [loading, setLoading] = useState(false)

  const generateVoucher = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/vouchers/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: Number(amount) }),
      })

      if (response.ok) {
        const data = await response.json()
        setVoucher(data.code)
      } else {
        alert('Failed to generate voucher')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error generating voucher')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Generate Voucher</h1>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter amount"
          />
        </div>

        <button
          onClick={generateVoucher}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Generating...' : 'Generate Voucher'}
        </button>

        {voucher && (
          <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-md">
            <p className="text-green-800 font-semibold">Voucher Generated:</p>
            <p className="text-green-800 text-lg font-mono">{voucher}</p>
          </div>
        )}
      </div>
    </div>
  )
}