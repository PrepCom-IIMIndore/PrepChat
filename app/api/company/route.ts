import { NextResponse } from "next/server";
import questionsData from "@/questions_data.json";
import formatsData from "@/interview_formats_data.json";
import slidesData from "@/slides_data.json";
import experiencesData from "@/interview_experiences_data.json";
import experienceStats from "@/interview_experience_stats.json";
import companyIndustries from "@/company_industries.json";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyName = searchParams.get("name")?.trim() || "";

  if (!companyName) {
    return NextResponse.json({ error: "Missing company name parameter 'name'" }, { status: 400 });
  }

  const companyQuestions = (questionsData as any[]).filter(q => q.company.toLowerCase() === companyName.toLowerCase());
  const formatText = (formatsData as any)[companyName] || null;
  const industry = (companyIndustries as any)[companyName] || (companyQuestions[0]?.industry || "Other");
  const companySlides = (slidesData as any[]).filter(s => s.company.toLowerCase() === companyName.toLowerCase() && s.deck_type === "company");
  const industrySlides = (slidesData as any[]).filter(s => s.company.toLowerCase() === industry.toLowerCase() && s.deck_type === "industry");
  const companyExperiences = (experiencesData as any[]).filter(e => e.company.toLowerCase() === companyName.toLowerCase());
  const compExperienceStats = (experienceStats as any).company_stats?.[companyName] || null;

  return NextResponse.json({
    company: companyName,
    industry: industry,
    questions: companyQuestions,
    format_text: formatText,
    company_slides: companySlides,
    industry_slides: industrySlides,
    experiences: companyExperiences,
    experience_stats: compExperienceStats
  });
}
