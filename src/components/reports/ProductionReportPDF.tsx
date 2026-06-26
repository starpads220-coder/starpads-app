import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  summaryBox: {
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 4,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 11,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '14.28%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#374151',
  },
  tableCol: {
    width: '14.28%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCellHeader: {
    margin: 5,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tableCell: {
    margin: 5,
    fontSize: 9,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#999',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  signature: {
    marginTop: 40,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    width: 200,
    paddingTop: 4,
    fontSize: 10,
  }
});

const STAGE_LABELS: Record<string, string> = {
  "STG-01": "Cutting",
  "STG-02": "Sewing Inner [M]",
  "STG-03": "Sewing Outer [TL]",
  "STG-04": "Overlocking",
  "STG-05": "Pouch Making",
  "STG-06": "Pinning",
  "STG-07": "Packaging",
};

interface EntryData {
  date?: string;
  employeeId?: string;
  stageId?: string;
  actualPieces?: number;
  targetPieces?: number;
  earningsUgx?: number;
}

interface ReportProps {
  title: string;
  period: string;
  entries: EntryData[];
  totalPieces: number;
  totalEarnings: number;
}

export const ProductionReportPDF = ({ title, period, entries, totalPieces, totalEarnings }: ReportProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Star Durable Pads</Text>
        <Text style={styles.subtitle}>{title} — {period}</Text>
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <Text style={styles.summaryText}>
          Total Entries: {entries.length} | Total Pieces: {totalPieces.toLocaleString()} | Total Earnings: UGX {totalEarnings.toLocaleString()}
        </Text>
      </View>

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Date</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Worker</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Stage</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Pieces</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Target</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Perf.</Text></View>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Earnings (UGX)</Text></View>
        </View>
        
        {entries.map((d, i) => {
          const date = d.date ?? "";
          const employeeId = d.employeeId ?? "";
          const stageId = d.stageId ?? "";
          const actualPieces = d.actualPieces ?? 0;
          const targetPieces = d.targetPieces ?? 0;
          const earningsUgx = d.earningsUgx ?? 0;
          const perf = targetPieces > 0 ? Math.round((actualPieces / targetPieces) * 100) + "%" : "—";
          return (
            <View style={styles.tableRow} key={i}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{date}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{employeeId}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{STAGE_LABELS[stageId] || stageId}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{actualPieces}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{targetPieces}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{perf}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{earningsUgx.toLocaleString()}</Text></View>
            </View>
          );
        })}
      </View>

      <View style={styles.signature}>
        <Text style={styles.signatureLine}>Authorised Signature</Text>
      </View>

      <Text style={styles.footer} fixed>
        Generated on {new Date().toLocaleString()} — Page 1
      </Text>
    </Page>
  </Document>
);
