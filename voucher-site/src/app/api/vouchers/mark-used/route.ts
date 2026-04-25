import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

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

export async function PUT(request: NextRequest) {
  const { voucherCode } = await request.json()

  if (!voucherCode) {
    return NextResponse.json({ message: 'Voucher code is required' }, { status: 400 })
  }

  try {
    const vouchers = getVouchers()
    const voucher = vouchers[voucherCode]

    if (!voucher || voucher.status !== 'active') {
      return NextResponse.json({ message: 'Voucher not found or already used' }, { status: 400 })
    }

    voucher.status = 'used'
    saveVouchers(vouchers)

    return NextResponse.json({ message: 'Voucher marked as used' }, { status: 200 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}