export const REGIONS = [
  "National Capital Region (NCR)",
  "Cordillera Administrative Region (CAR)",
  "Region I (Ilocos Region)",
  "Region II (Cagayan Valley)",
  "Region III (Central Luzon)",
  "Region IV-A (CALABARZON)",
  "Region IV-B (MIMAROPA)",
  "Region V (Bicol Region)",
  "Region VI (Western Visayas)",
  "Region VII (Central Visayas)",
  "Region VIII (Eastern Visayas)",
  "Region IX (Zamboanga Peninsula)",
  "Region X (Northern Mindanao)",
  "Region XI (Davao Region)",
  "Region XII (SOCCSKSARGEN)",
  "Region XIII (Caraga)",
  "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)"
] as const;

export const PROVINCES: Record<string, string[]> = {
  "National Capital Region (NCR)": [
    "Metro Manila" // NCR doesn't have provinces, but we treat it as one for the dropdown logic or skip to city
  ],
  "Cordillera Administrative Region (CAR)": [
    "Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province"
  ],
  "Region I (Ilocos Region)": [
    "Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan"
  ],
  "Region II (Cagayan Valley)": [
    "Batanes", "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino"
  ],
  "Region III (Central Luzon)": [
    "Aurora", "Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales"
  ],
  "Region IV-A (CALABARZON)": [
    "Batangas", "Cavite", "Laguna", "Quezon", "Rizal"
  ],
  "Region IV-B (MIMAROPA)": [
    "Marinduque", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Romblon"
  ],
  "Region V (Bicol Region)": [
    "Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon"
  ],
  "Region VI (Western Visayas)": [
    "Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Negros Occidental"
  ],
  "Region VII (Central Visayas)": [
    "Bohol", "Cebu", "Negros Oriental", "Siquijor"
  ],
  "Region VIII (Eastern Visayas)": [
    "Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte"
  ],
  "Region IX (Zamboanga Peninsula)": [
    "Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay"
  ],
  "Region X (Northern Mindanao)": [
    "Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental"
  ],
  "Region XI (Davao Region)": [
    "Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental"
  ],
  "Region XII (SOCCSKSARGEN)": [
    "Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat"
  ],
  "Region XIII (Caraga)": [
    "Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur"
  ],
  "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)": [
    "Basilan", "Lanao del Sur", "Maguindanao del Norte", "Maguindanao del Sur", "Sulu", "Tawi-Tawi"
  ]
};

// Simplified list of major cities for demo purposes
// In a production app, this should be a complete JSON or API
export const CITIES: Record<string, string[]> = {
  "Metro Manila": [
    "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong", "Manila", "Marikina", "Muntinlupa",
    "Navotas", "Parañaque", "Pasay", "Pasig", "Quezon City", "San Juan", "Taguig", "Valenzuela", "Pateros"
  ],
  "Cebu": [
    "Cebu City", "Lapu-Lapu City", "Mandaue City", "Talisay City", "Danaue City", "Bogo City", "Carcar City", "Naga City", "Toledo City"
  ],
  "Cavite": [
    "Bacoor", "Cavite City", "Dasmariñas", "General Trias", "Imus", "Tagaytay", "Trece Martires"
  ],
  "Laguna": [
    "Biñan", "Cabuyao", "Calamba", "San Pablo", "San Pedro", "Santa Rosa"
  ],
  "Davao del Sur": [
    "Davao City", "Digos City"
  ],
  // Fallback for other provinces can be handled in the component
};
