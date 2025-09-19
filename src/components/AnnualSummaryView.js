import React, { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Card, CardContent, CardHeader, CardTitle } from "./ui";

const AnnualSummaryView = ({ incidents }) => {
  const [summaryData, setSummaryData] = useState({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const calculatedSummaryData = useMemo(() => {
    if (!incidents || incidents.length <= 1) {
      return {};
    }

    const headers = incidents[0];
    const incidentRows = incidents.slice(1);

    const userEmailIndex = headers.indexOf('Usuari (Email)');
    const durationIndex = headers.indexOf('Duració');
    const exerciseIndex = headers.indexOf('Exercici');
    const typeIndex = headers.indexOf('Tipus');

    if ([userEmailIndex, durationIndex, exerciseIndex, typeIndex].includes(-1)) {
      console.error("AnnualSummaryView: Missing required columns.");
      return {};
    }

    const newSummaryData = {};

    incidentRows.forEach(item => {
      const incident = item.data;
      const userEmail = incident[userEmailIndex];
      const durationStr = incident[durationIndex];
      const exercise = incident[exerciseIndex];
      const type = incident[typeIndex];

      // Filter by selected year
      if (exercise !== selectedYear) return;

      // Initialize user data if not exists
      if (!newSummaryData[userEmail]) {
        newSummaryData[userEmail] = { totalHours: 0, totalDays: 0, typeBreakdown: {} };
      }

      // Parse duration
      if (durationStr) {
        if (durationStr.includes('h')) {
          // Hours format: "Xh Ym"
          const hoursMatch = durationStr.match(/(\d+)h/);
          const minutesMatch = durationStr.match(/(\d+)m/);
          const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
          const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
          newSummaryData[userEmail].totalHours += hours + (minutes / 60);
        } else if (durationStr.includes('dies')) {
          // Days format: "X dies"
          const daysMatch = durationStr.match(/(\d+) dies/);
          const days = daysMatch ? parseInt(daysMatch[1]) : 0;
          newSummaryData[userEmail].totalDays += days;
        }
      }

      // Type breakdown
      if (!newSummaryData[userEmail].typeBreakdown[type]) {
        newSummaryData[userEmail].typeBreakdown[type] = 0;
      }
      newSummaryData[userEmail].typeBreakdown[type] += 1;
    });

    return newSummaryData;
  }, [incidents, selectedYear]);

  useEffect(() => {
    setSummaryData(calculatedSummaryData);
  }, [calculatedSummaryData]);

  const years = [...new Set(incidents.slice(1).map(item => item.data[incidents[0].indexOf('Exercici')]))].filter(Boolean).sort((a, b) => b - a);
  const allTypes = [...new Set(incidents.slice(1).map(item => item.data[incidents[0].indexOf('Tipus')]))].filter(Boolean);

  const formatDuration = (summary) => {
    let parts = [];
    if (summary.days > 0) {
      parts.push(`${summary.days}d`);
    }
    if (summary.hours > 0 || summary.minutes > 0) {
      parts.push(`${summary.hours}h ${summary.minutes}m`);
    }
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  return (
    <div className="p-4">
      <h3 className="text-xl font-semibold mb-4">Resum Anual d'Incidències</h3>
      <div className="mb-4">
        <label htmlFor="summaryYearFilter" className="block text-sm font-medium text-gray-700 mb-1">Seleccioneu l'Any:</label>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccioneu un any" />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {Object.keys(summaryData).length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuari</TableHead>
                  {allTypes.map((type, index) => (
                    <TableHead key={index}>{type}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(summaryData).map(userEmail => (
                  <TableRow key={userEmail}>
                    <TableCell className="font-medium">{userEmail}</TableCell>
                    {allTypes.map((type, index) => (
                      <TableCell key={index}>
                        {summaryData[userEmail][type] ? formatDuration(summaryData[userEmail][type]) : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <p>No hi ha dades de resum per mostrar per a l'any seleccionat.</p>
      )}
    </div>
  );
};

export default AnnualSummaryView;