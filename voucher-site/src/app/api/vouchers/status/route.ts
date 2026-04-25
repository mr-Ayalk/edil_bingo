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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const voucherCode = searchParams.get('voucherCode')

  if (!voucherCode) {
    return NextResponse.json({ message: 'Voucher code is required' }, { status: 400 })
  }

  try {
    const vouchers = getVouchers()
    const voucher = vouchers[voucherCode]

    if (!voucher) {
      return NextResponse.json({ status: false }, { status: 200 })
    }

    return NextResponse.json({
      status: voucher.status,
      amount: voucher.amount
    }, { status: 200 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}