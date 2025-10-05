import React, { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Card, CardContent, CardHeader, CardTitle } from "./ui";

const AnnualSummaryView = ({ incidents, incidentTypes }) => {
  const [summaryData, setSummaryData] = useState({});
  const [selectedYear, setSelectedYear] = useState('');

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

      // Type breakdown - sum durations by type
      if (!newSummaryData[userEmail].typeBreakdown[type]) {
        newSummaryData[userEmail].typeBreakdown[type] = { totalHours: 0, totalDays: 0 };
      }
      
      // Get the unit of duration for this type
      const typeInfo = incidentTypes.find(t => t.NomTipus === type);
      const unitatDurada = typeInfo ? typeInfo.UnitatDurada : 'H'; // Default to hours
      
      // Parse and sum duration based on type's unit
      if (durationStr) {
        if (unitatDurada === 'H') {
          // Hours format: "Xh Ym"
          if (durationStr.includes('h')) {
            const hoursMatch = durationStr.match(/(\d+)h/);
            const minutesMatch = durationStr.match(/(\d+)m/);
            const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
            const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
            newSummaryData[userEmail].typeBreakdown[type].totalHours += hours + (minutes / 60);
          }
        } else if (unitatDurada === 'D') {
          // Days format: "X dies"
          if (durationStr.includes('dies')) {
            const daysMatch = durationStr.match(/(\d+) dies/);
            const days = daysMatch ? parseInt(daysMatch[1]) : 0;
            newSummaryData[userEmail].typeBreakdown[type].totalDays += days;
          }
        }
      }
    });

    return newSummaryData;
  }, [incidents, selectedYear]);

  useEffect(() => {
    setSummaryData(calculatedSummaryData);
  }, [calculatedSummaryData]);

  const years = [...new Set(incidents.slice(1).map(item => item.data[incidents[0].indexOf('Exercici')]))].filter(Boolean).sort((a, b) => b - a);
  const allTypes = [...new Set(incidents.slice(1).map(item => item.data[incidents[0].indexOf('Tipus')]))].filter(Boolean);

  // Set the most recent year as default when data loads
  useEffect(() => {
    if (years.length > 0 && selectedYear === '') {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  const formatDuration = (summary) => {
    let parts = [];
    if (summary.totalDays > 0) {
      parts.push(`${summary.totalDays} dies`);
    }
    if (summary.totalHours > 0) {
      // Convert decimal hours to hours and minutes
      const totalMinutes = Math.round(summary.totalHours * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (minutes > 0) {
        parts.push(`${hours}h ${minutes}m`);
      } else {
        parts.push(`${hours}h`);
      }
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
                    {allTypes.map((type, index) => {
                      const typeData = summaryData[userEmail].typeBreakdown[type];
                      if (!typeData) return <TableCell key={index}>-</TableCell>;
                      
                      // Format the duration based on type's unit
                      const typeInfo = incidentTypes.find(t => t.NomTipus === type);
                      const unitatDurada = typeInfo ? typeInfo.UnitatDurada : 'H';
                      
                      let displayValue = '-';
                      if (unitatDurada === 'H' && typeData.totalHours > 0) {
                        // Show hours in format: Xh Ym
                        const totalMinutes = Math.round(typeData.totalHours * 60);
                        const hours = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        displayValue = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
                      } else if (unitatDurada === 'D' && typeData.totalDays > 0) {
                        // Show days in format: X dies
                        displayValue = `${typeData.totalDays} dies`;
                      }
                      
                      return <TableCell key={index}>{displayValue}</TableCell>;
                    })}
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