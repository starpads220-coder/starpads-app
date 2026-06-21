import { StyleSheet } from "@react-pdf/renderer";

export const pdfStyles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 30,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingBottom: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  summaryBox: {
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 4,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 11,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#666",
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: "bold",
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableColHeader: {
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#374151",
  },
  tableCol: {
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCellHeader: {
    margin: 5,
    fontSize: 10,
    fontWeight: "bold",
    color: "#ffffff",
  },
  tableCell: {
    margin: 5,
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 10,
    color: "#999",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  signature: {
    marginTop: 40,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    width: 200,
    paddingTop: 4,
    fontSize: 10,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#374151",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  metricBox: {
    backgroundColor: "#f9fafb",
    padding: 8,
    borderRadius: 4,
    width: "30%",
  },
  metricLabel: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
});

export function colWidth(pct: number): string {
  return `${pct}%`;
}

export function makeColStyle(width: string, isHeader = false) {
  return isHeader
    ? { ...pdfStyles.tableColHeader, width }
    : { ...pdfStyles.tableCol, width };
}

export function makeCell(text: string, isHeader = false) {
  return {
    margin: 5,
    fontSize: isHeader ? 10 : 9,
    fontWeight: isHeader ? ("bold" as const) : ("normal" as const),
    color: isHeader ? "#ffffff" : "#000000",
  };
}
