import React from "react";
import { Page, Text, View, Document } from "@react-pdf/renderer";
import { pdfStyles } from "./PDFStyles";

interface AnalyticsPDFProps {
  title: string;
  period: string;
  totalPieces: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  avgPerformance: number;
  totalWorkers: number;
  totalEntries: number;
  stockPadsTotal: number;
}

export function AnalyticsPDF({
  title, period, totalPieces, totalRevenue, totalExpenses, netProfit,
  avgPerformance, totalWorkers, totalEntries, stockPadsTotal,
}: AnalyticsPDFProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Star Durable Pads</Text>
          <Text style={pdfStyles.subtitle}>{title} &mdash; {period}</Text>
        </View>

        <View style={pdfStyles.summaryBox}>
          <Text style={pdfStyles.summaryTitle}>Analytics Overview</Text>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Production Pieces</Text>
            <Text style={pdfStyles.summaryValue}>{totalPieces.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Revenue</Text>
            <Text style={pdfStyles.summaryValue}>UGX {totalRevenue.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Expenses</Text>
            <Text style={pdfStyles.summaryValue}>UGX {totalExpenses.toLocaleString()}</Text>
          </View>
          <View style={{ ...pdfStyles.summaryRow, borderTopWidth: 1, borderTopColor: "#d1d5db", paddingTop: 4, marginTop: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "bold" }}>Net Profit</Text>
            <Text style={{ fontSize: 12, fontWeight: "bold", color: netProfit >= 0 ? "#059669" : "#dc2626" }}>
              UGX {netProfit.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Key Metrics</Text>
          <View style={pdfStyles.metricGrid}>
            <View style={pdfStyles.metricBox}>
              <Text style={pdfStyles.metricLabel}>Production Entries</Text>
              <Text style={pdfStyles.metricValue}>{totalEntries.toLocaleString()}</Text>
            </View>
            <View style={pdfStyles.metricBox}>
              <Text style={pdfStyles.metricLabel}>Active Workers</Text>
              <Text style={pdfStyles.metricValue}>{totalWorkers}</Text>
            </View>
            <View style={pdfStyles.metricBox}>
              <Text style={pdfStyles.metricLabel}>Avg Performance</Text>
              <Text style={pdfStyles.metricValue}>{avgPerformance}%</Text>
            </View>
            <View style={pdfStyles.metricBox}>
              <Text style={pdfStyles.metricLabel}>Stock (Pads)</Text>
              <Text style={pdfStyles.metricValue}>{stockPadsTotal.toLocaleString()}</Text>
            </View>
            <View style={pdfStyles.metricBox}>
              <Text style={pdfStyles.metricLabel}>Avg Revenue/Day</Text>
              <Text style={pdfStyles.metricValue}>UGX {Math.round(totalRevenue / 30).toLocaleString()}</Text>
            </View>
            <View style={pdfStyles.metricBox}>
              <Text style={pdfStyles.metricLabel}>Profit Margin</Text>
              <Text style={pdfStyles.metricValue}>{totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%</Text>
            </View>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Performance Summary</Text>
          <View style={pdfStyles.summaryBox}>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Total Production</Text>
              <Text style={pdfStyles.summaryValue}>{totalPieces.toLocaleString()} pieces</Text>
            </View>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Total Sales Revenue</Text>
              <Text style={pdfStyles.summaryValue}>UGX {totalRevenue.toLocaleString()}</Text>
            </View>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Total Expenses</Text>
              <Text style={pdfStyles.summaryValue}>UGX {totalExpenses.toLocaleString()}</Text>
            </View>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Net Result</Text>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: netProfit >= 0 ? "#059669" : "#dc2626" }}>
                {netProfit >= 0 ? "+" : ""}UGX {netProfit.toLocaleString()}
              </Text>
            </View>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Stock in Storage</Text>
              <Text style={pdfStyles.summaryValue}>{stockPadsTotal.toLocaleString()} pads</Text>
            </View>
          </View>
        </View>

        <View style={pdfStyles.signature}>
          <Text style={pdfStyles.signatureLine}>Authorised Signature</Text>
        </View>

        <Text style={pdfStyles.footer} fixed>
          Generated on {new Date().toLocaleString()} &mdash; Page 1
        </Text>
      </Page>
    </Document>
  );
}
