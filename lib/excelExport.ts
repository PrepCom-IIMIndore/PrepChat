import * as XLSX from "xlsx";

export function exportExperiencesToExcel(
  experiences: any[],
  companyName: string,
  years: string[]
): boolean {
  if (!experiences || experiences.length === 0) {
    if (typeof window !== "undefined") {
      alert(`No interview experiences found for ${companyName || "the selected company"} to download.`);
    }
    return false;
  }

  const exportData = experiences.map((exp: any, index: number) => ({
    "Serial Number": index + 1,
    "Company Name": exp.company || companyName || "",
    "Graduating Batch Year": exp.year || "",
    "Domain Specialization": exp.normalizedDomain || exp.domain || "",
    "Role / Profile Offered": exp.role_offered || "",
    "Process Type": exp.process_type || "Placement Process",
    "Selection Status (Converted)": exp.converted
      ? (String(exp.converted).toLowerCase().includes("yes") ? "Converted" : exp.converted)
      : "Not Specified",
    "Interview Rounds Count": exp.interview_rounds !== null && exp.interview_rounds !== undefined
      ? exp.interview_rounds
      : "Not Specified",
    "Interview Rounds & Duration Breakdown": exp.no_interviews_duration || "",
    "Buddy Round Conducted": exp.buddy_round || "Not Specified",
    "GD Conducted": exp.gd_conducted || "Not Specified",
    "GD Duration (mins)": exp.gd_duration || "",
    "GD Topics & Tips": exp.gd_topics_tips || "",
    "Pre-Process & Screening Tests Details": exp.pre_process_tips || "",
    "Interview Outline & Flow": exp.interview_outline || "",
    "Domain Specific Questions": exp.domain_questions || "",
    "Situational & Behavioural Questions": exp.situational_questions || "",
    "HR & Current Affairs Questions": exp.hr_gk_questions || "",
    "Technical Skills Assessed": exp.tech_skills || "",
    "Resources & Preparation Methods": exp.prep_resources || "",
    "What the Recruiters Were Looking For": exp.looking_for || "",
    "What Went Right / Wrong": exp.right_wrong || "",
    "Key Interview Tips That Helped": exp.tips || "",
    "Do's and Don'ts / Special Preparation": exp.dos_and_donts || "",
    "UG Degree Background": exp.ug_background || "",
    "Professional Certifications": exp.certifications || "",
    "Question Focus Buckets": Array.isArray(exp.buckets) ? exp.buckets.join(", ") : (exp.buckets || ""),
    "Additional Remarks": exp.additional_remarks || "",
    "Total Word Count": exp.word_count || 0
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set intelligent column widths based on header and cell content length
  const colWidths = Object.keys(exportData[0] || {}).map(key => {
    const maxContent = Math.max(
      key.length,
      ...exportData.map(row => String((row as any)[key] || "").length)
    );
    return { wch: Math.min(Math.max(maxContent + 2, 14), 60) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  const safeSheetName = (companyName.slice(0, 25) || "Experiences").replace(/[:\\/?*\[\]]/g, "_");
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  const cleanCo = (companyName || "Company")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const yearSuffix = years && years.length > 0 ? years.join("-") : "AllYears";
  const filename = `PrepChat_${cleanCo}_${yearSuffix}_Experiences.xlsx`;

  XLSX.writeFile(workbook, filename);
  return true;
}
