import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import {
  scheduledSourceCheck,
  checkSource,
  processContent,
  analyzeContent,
} from "@/inngest/functions"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    scheduledSourceCheck,
    checkSource,
    processContent,
    analyzeContent,
  ],
})
