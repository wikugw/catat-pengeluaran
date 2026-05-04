import ExcelJS from 'exceljs'
import { Pengeluaran } from './supabase'

function fmtRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export async function exportToExcel(data: Pengeluaran[], year: number, month: number) {
  const monthLabel = new Date(year, month)
    .toLocaleString('id-ID', { month: 'long', year: 'numeric' })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'CatatDuit'
  workbook.lastModifiedBy = 'CatatDuit'
  workbook.created = new Date()
  workbook.modified = new Date()

  // ── Sheet 1: Transaksi ──────────────────────────────────────────────────
  const wsTrans = workbook.addWorksheet('Transaksi')
  wsTrans.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Tanggal', key: 'tanggal', width: 22 },
    { header: 'Kategori', key: 'kategori', width: 26 },
    { header: 'Keterangan', key: 'keterangan', width: 35 },
    { header: 'Nominal', key: 'nominal', width: 16 },
    { header: 'Nominal (Rp)', key: 'nominal_rp', width: 22 },
    { header: 'Dicatat oleh', key: 'created_by', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
  ]

  data.forEach((p, i) => {
    wsTrans.addRow({
      no: i + 1,
      tanggal: fmtDate(p.created_at),
      kategori: p.jenis_nama,
      keterangan: p.keterangan ?? '',
      nominal: p.nominal,
      nominal_rp: fmtRupiah(p.nominal),
      created_by: p.created_by.charAt(0).toUpperCase() + p.created_by.slice(1),
      status: p.synced_at ? 'Tersinkron' : 'Offline',
    })
  })

  // ── Sheet 2: Ringkasan per Kategori ────────────────────────────────────
  const wsSummary = workbook.addWorksheet('Kategori')
  wsSummary.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Kategori', key: 'kategori', width: 28 },
    { header: 'Jumlah Transaksi', key: 'count', width: 20 },
    { header: 'Total', key: 'total', width: 16 },
    { header: 'Total (Rp)', key: 'total_rp', width: 22 },
    { header: 'Rata-rata', key: 'avg', width: 16 },
    { header: 'Rata-rata (Rp)', key: 'avg_rp', width: 22 },
    { header: '% dari Total', key: 'pct', width: 16 },
  ]

  const grandTotal = data.reduce((s, p) => s + p.nominal, 0)
  const byKategori: Record<string, { total: number; count: number }> = {}
  for (const p of data) {
    if (!byKategori[p.jenis_nama]) byKategori[p.jenis_nama] = { total: 0, count: 0 }
    byKategori[p.jenis_nama].total += p.nominal
    byKategori[p.jenis_nama].count += 1
  }

  const summaryRows = Object.entries(byKategori)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([nama, v], i) => ({
      no: i + 1,
      kategori: nama,
      count: v.count,
      total: v.total,
      total_rp: fmtRupiah(v.total),
      avg: Math.round(v.total / v.count),
      avg_rp: fmtRupiah(Math.round(v.total / v.count)),
      pct: parseFloat(((v.total / grandTotal) * 100).toFixed(1)),
    }))

  wsSummary.addRows(summaryRows)
  wsSummary.addRow({
    no: 0,
    kategori: 'TOTAL',
    count: data.length,
    total: grandTotal,
    total_rp: fmtRupiah(grandTotal),
    avg: Math.round(grandTotal / data.length),
    avg_rp: fmtRupiah(Math.round(grandTotal / data.length)),
    pct: 100,
  })

  // ── Sheet 3: Ringkasan per Orang ───────────────────────────────────────
  const wsOrang = workbook.addWorksheet('Per Orang')
  wsOrang.columns = [
    { header: 'Nama', key: 'nama', width: 16 },
    { header: 'Jumlah Transaksi', key: 'count', width: 20 },
    { header: 'Total', key: 'total', width: 16 },
    { header: 'Total (Rp)', key: 'total_rp', width: 22 },
    { header: 'Rata-rata per Transaksi', key: 'avg', width: 26 },
    { header: 'Rata-rata (Rp)', key: 'avg_rp', width: 22 },
    { header: '% dari Total', key: 'pct', width: 16 },
  ]

  const byOrang: Record<string, { total: number; count: number }> = {}
  for (const p of data) {
    if (!byOrang[p.created_by]) byOrang[p.created_by] = { total: 0, count: 0 }
    byOrang[p.created_by].total += p.nominal
    byOrang[p.created_by].count += 1
  }

  const orangRows = Object.entries(byOrang)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([nama, v]) => ({
      nama: nama.charAt(0).toUpperCase() + nama.slice(1),
      count: v.count,
      total: v.total,
      total_rp: fmtRupiah(v.total),
      avg: Math.round(v.total / v.count),
      avg_rp: fmtRupiah(Math.round(v.total / v.count)),
      pct: parseFloat(((v.total / grandTotal) * 100).toFixed(1)),
    }))

  wsOrang.addRows(orangRows)
  wsOrang.addRow({
    nama: 'TOTAL',
    count: data.length,
    total: grandTotal,
    total_rp: fmtRupiah(grandTotal),
    avg: Math.round(grandTotal / data.length),
    avg_rp: fmtRupiah(Math.round(grandTotal / data.length)),
    pct: 100,
  })

  // ── Sheet 4: Ringkasan Harian ──────────────────────────────────────────
  const wsHarian = workbook.addWorksheet('Harian')
  wsHarian.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Tanggal', key: 'tanggal', width: 16 },
    { header: 'Jumlah Transaksi', key: 'count', width: 20 },
    { header: 'Total', key: 'total', width: 16 },
    { header: 'Total (Rp)', key: 'total_rp', width: 22 },
  ]

  const byDate: Record<string, { total: number; count: number }> = {}
  for (const p of data) {
    const d = new Date(p.created_at).toLocaleDateString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    if (!byDate[d]) byDate[d] = { total: 0, count: 0 }
    byDate[d].total += p.nominal
    byDate[d].count += 1
  }

  const harianRows = Object.entries(byDate)
    .sort((a, b) => {
      const parse = (s: string) => {
        const [d, m, y] = s.split('/')
        return new Date(+y, +m - 1, +d).getTime()
      }
      return parse(a[0]) - parse(b[0])
    })
    .map(([tgl, v], i) => ({
      no: i + 1,
      tanggal: tgl,
      count: v.count,
      total: v.total,
      total_rp: fmtRupiah(v.total),
    }))

  wsHarian.addRows(harianRows)

  // ── Download ───────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const safeName = monthLabel.replace(/\s+/g, '_')
  anchor.download = `CatatDuit_${safeName}.xlsx`
  anchor.click()
  window.URL.revokeObjectURL(url)
}
