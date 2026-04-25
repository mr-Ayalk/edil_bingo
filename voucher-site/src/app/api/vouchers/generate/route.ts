import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const vouchersPath = path.join(process.cwd(), 'vouchers.json')

function getVouchers() {
  if (!fs.existsSync(vouchersPath)) {
    return {}
  }
  const data = fs.readFileSync(vouchersPath, 'utf-8')
  return JSON.parse(data)
}

function saveVouchers(vouchers: any) {
  fs.writeFileSync(vouchersPath, JSON.stringify(vouchers, null, 2))
}

function generateVoucherCode() {
  return crypto.randomBytes(8).toString('hex').toUpperCase()
}

export async function POST(request: NextRequest) {
  const { amount } = await request.json()

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ message: 'Valid amount is required' }, { status: 400 })
  }

  try {
    const code = generateVoucherCode()
    const vouchers = getVouchers()

    if (vouchers[code]) {
      // Rare collision, generate again
      return POST(request)
    }

    vouchers[code] = {
      amount,
      status: 'active',
      created_at: new Date().toISOString()
    }

    saveVouchers(vouchers)

    return NextResponse.json({ code, amount }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}