import { cloneDeep } from 'lodash'

import { AskResponse, Citation, FollowUpQuestion} from '../../api'

export type ParsedAnswer = {
  citations: Citation[],
  followUpQuestions: FollowUpQuestion[],
  markdownFormatText: string,
  generated_chart: string | null
} | null

export const enumerateCitations = (citations: Citation[]) => {
  const filepathMap = new Map()
  for (const citation of citations) {
    const { filepath } = citation
    let part_i = 1
    if (filepathMap.has(filepath)) {
      part_i = filepathMap.get(filepath) + 1
    }
    filepathMap.set(filepath, part_i)
    citation.part_index = part_i
  }
  return citations
}

export function parseAnswer(answer: AskResponse): ParsedAnswer {
  if (typeof answer.answer !== "string") return null
  let answerText = answer.answer
  let allFollowUpQuestions = [] as FollowUpQuestion[];


  const citationLinks = answerText.match(/\[(doc\d\d?\d?)]/g)

  const lengthDocN = '[doc'.length

  let filteredCitations = [] as Citation[]
  let citationReindex = 0

  


  citationLinks?.forEach(link => {
    // Replacing the links/citations with number
    const citationIndex = link.slice(lengthDocN, link.length - 1)
    const citation = cloneDeep(answer.citations[Number(citationIndex) - 1]) as Citation
    if (!filteredCitations.find(c => c.id === citationIndex) && citation) {
      // remove the follow up questions
      answerText = answerText.replaceAll(link, ` ^${++citationReindex}^ `)
      citation.id = citationIndex // original doc index to de-dupe
      citation.reindex_id = citationReindex.toString() // reindex from 1 for display
      filteredCitations.push(citation)
    }
  })
  console.log("Modified filteredCitations:", filteredCitations);
  console.log("Modified allFollowUpQuestions:", allFollowUpQuestions);
  filteredCitations = enumerateCitations(filteredCitations)
  
  const regex = /<<([^>>]+)>>/g;
  let match;
  while ((match = regex.exec(answerText)) !== null) {
    allFollowUpQuestions.push({ question: match[1].trim() });
  }

  answerText = answerText.replace(/<<([^>>]+)>>/g, (match, p1) => `\n\n• ${p1.trim()}`);

  // 
  return {
    citations: filteredCitations,
    markdownFormatText: answerText,
    followUpQuestions: allFollowUpQuestions,
    generated_chart: answer.generated_chart
  }
}
