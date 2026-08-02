import { NextResponse } from "next/server";
import experiencesData from "@/interview_experiences_data.json";
import experienceStats from "@/interview_experience_stats.json";
import companyIndustries from "@/company_industries.json";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get("company")?.trim() || "";
  const domain = searchParams.get("domain")?.trim() || "";
  const year = searchParams.get("year")?.trim() || "";
  const process = searchParams.get("process_type")?.trim() || "";
  const search = searchParams.get("search")?.trim().toLowerCase() || "";

  let filtered = experiencesData as any[];

  if (company) {
    filtered = filtered.filter(e => e.company.toLowerCase() === company.toLowerCase());
  }
  if (domain) {
    filtered = filtered.filter(e => e.domain.toLowerCase() === domain.toLowerCase());
  }
  if (year) {
    filtered = filtered.filter(e => e.year.toLowerCase() === year.toLowerCase());
  }
  if (process) {
    filtered = filtered.filter(e => e.process_type.toLowerCase() === process.toLowerCase());
  }
  if (search) {
    filtered = filtered.filter(exp => {
      const searchable = `${exp.company} ${exp.domain} ${exp.role_offered} ${exp.pre_process_tips} ${exp.gd_topics_tips} ${exp.interview_outline} ${exp.domain_questions} ${exp.hr_gk_questions} ${exp.prep_resources} ${exp.tips} ${exp.tech_skills} ${exp.dos_and_donts}`.toLowerCase();
      return searchable.includes(search);
    });
  }

  // Sort by word count descending
  filtered.sort((a, b) => (b.word_count || 0) - (a.word_count || 0));

  return NextResponse.json({
    experiences: filtered,
    stats: experienceStats,
    industries: companyIndustries
  });
}
