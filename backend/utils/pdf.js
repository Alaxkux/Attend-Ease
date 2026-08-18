// Generates a simple attendance certificate as HTML string
// Can be printed/saved as PDF from the browser
function generateCertificateHTML(student, courses, institution, semester) {
  const rows = courses.map(c => `
    <tr>
      <td>${c.courseCode}</td>
      <td>${c.courseName}</td>
      <td>${c.totalSessions}</td>
      <td>${c.attended}</td>
      <td style="color:${c.rate >= 75 ? '#22c55e' : '#ef4444'};font-weight:700">${c.rate}%</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; color: #111; padding: 40px; }
  .header { text-align: center; border-bottom: 3px solid #22c55e; padding-bottom: 24px; margin-bottom: 32px; }
  .logo { font-size: 2rem; font-weight: 800; color: #22c55e; }
  h1 { font-size: 1.4rem; color: #333; margin: 8px 0; }
  .meta { color: #666; font-size: 0.9rem; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  th { background: #f4f4f8; padding: 12px; text-align: left; font-size: 0.85rem; color: #666; }
  td { padding: 12px; border-bottom: 1px solid #eee; font-size: 0.9rem; }
  .footer { text-align: center; margin-top: 40px; color: #aaa; font-size: 0.8rem; }
  .seal { display: inline-block; border: 2px solid #22c55e; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; text-align: center; color: #22c55e; font-weight: 800; font-size: 0.7rem; margin: 16px; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">AttendEase</div>
    <h1>Attendance Certificate</h1>
    <p class="meta">${institution}</p>
    <p class="meta">${semester}</p>
  </div>
  <p>This is to certify that:</p>
  <h2 style="color:#22c55e">${student.name}</h2>
  <p class="meta">Matric Number: <strong>${student.matricNumber}</strong></p>
  <p class="meta">Email: ${student.email}</p>
  <p>has the following attendance record for the ${semester}:</p>
  <table>
    <thead><tr><th>Code</th><th>Course</th><th>Sessions</th><th>Attended</th><th>Rate</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="text-align:center;margin-top:32px">
    <div class="seal">AE<br>CERT</div>
    <p style="color:#aaa;font-size:0.8rem">Generated on ${new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
  </div>
  <div class="footer">This certificate was generated automatically by AttendEase. Verify at attendease.app</div>
</body>
</html>`;
}

module.exports = { generateCertificateHTML };
