export const WRITING_TEMPLATES = {
  WRITE_ESSAY: [
    {
      label: "Agree/Disagree",
      structure: `Introduction (2-3 sentences):
• Paraphrase the topic
• State your position clearly

Body Paragraph 1 — Main argument (4-5 sentences):
• Topic sentence supporting your view
• Explanation + example
• Link back to position

Body Paragraph 2 — Counter + rebuttal (4-5 sentences):
• Acknowledge opposing view
• Refute with evidence
• Reinforce your position

Conclusion (2 sentences):
• Restate position
• Summarise key points`,
      template: `It is often argued that [topic]. While some believe [opposing view], I strongly agree/disagree that [your position].

To begin with, [main argument]. For instance, [example]. This clearly demonstrates that [link to position].

Admittedly, [counter-argument]. However, [rebuttal with evidence]. Therefore, [reinforce position].

In conclusion, [restate position]. Overall, [summary of key points].`,
    },
    {
      label: "Discuss Both Views",
      structure: `Introduction: paraphrase + say you will discuss both
Body 1: First view + reasons
Body 2: Second view + reasons
Conclusion: Your balanced opinion`,
      template: `The question of whether [topic] has sparked considerable debate. This essay will examine both perspectives before reaching a conclusion.

On one hand, [first view]. This is because [reason 1]. Furthermore, [reason 2], which means [impact].

On the other hand, [second view]. Proponents of this view argue that [reason]. Additionally, [supporting point].

In conclusion, while [first view summary], I believe [your opinion] because [brief reason].`,
    },
    {
      label: "Problem/Solution",
      structure: `Introduction: introduce the problem
Body 1: Causes/extent of problem
Body 2: Solutions
Conclusion: Recommendations`,
      template: `[Topic] has become an increasingly serious issue in modern society. This essay will explore the causes of this problem and suggest viable solutions.

The primary cause of [problem] is [cause 1]. Moreover, [cause 2] has further exacerbated the situation, leading to [consequence].

To address this, [solution 1] should be implemented. For example, [specific action]. Additionally, [solution 2] would help by [explanation].

In conclusion, [problem] requires urgent attention. If [solutions] are adopted, [positive outcome] can be achieved.`,
    },
  ],
  SUMMARIZE_WRITTEN_TEXT: [
    {
      label: "Standard Formula",
      structure: "One sentence: Main subject + key verb + supporting detail + result/conclusion",
      template: `The passage discusses [main topic], highlighting that [key point 1] and [key point 2], ultimately concluding that [main conclusion].`,
    },
    {
      label: "Cause-Effect",
      structure: "Subject + cause + effect + implication",
      template: `According to the passage, [subject] [verb phrase] because [cause], which results in [effect], suggesting that [implication].`,
    },
  ],
};

export const SPEAKING_TEMPLATES = {
  DESCRIBE_IMAGE: [
    {
      label: "Graph/Chart",
      template: `The [graph/chart/diagram] illustrates [what it shows] in [time period/place].

Overall, the most notable trend is [main observation].

Looking at the details, [specific data point 1]. In contrast, [specific data point 2]. Furthermore, [additional observation].

In conclusion, [summarise the main trend or comparison].`,
    },
    {
      label: "Picture/Photo",
      template: `The image shows [general description of the scene].

In the foreground, [describe front elements]. In the background, [describe back elements].

The overall atmosphere appears [adjective], suggesting [interpretation].

In summary, the image depicts [one-line conclusion].`,
    },
    {
      label: "Process/Diagram",
      template: `The diagram illustrates the process of [topic], which consists of [number] main stages.

The process begins with [first stage]. This is followed by [second stage], where [description]. Subsequently, [third stage] occurs.

Finally, the process concludes with [last stage], resulting in [outcome].`,
    },
  ],
  RETELL_LECTURE: {
    template: `The lecture discusses [main topic].

The speaker begins by explaining [opening point]. They then go on to describe [key point 2], noting that [detail].

Furthermore, [additional point] is mentioned, with particular emphasis on [specific aspect].

In conclusion, the speaker highlights that [main takeaway].`,
  },
  RESPOND_TO_SITUATION: {
    template: `Thank you for bringing this to my attention.

I understand that [restate the situation]. In response to this, I would [your action/response].

The reason for my approach is [justification]. Additionally, [supporting point].

I hope this addresses [the concern], and I am happy to [offer further help].`,
  },
  SUMMARIZE_GROUP_DISCUSSION: {
    template: `The discussion centred around [main topic].

Several participants argued that [first viewpoint], emphasising [key reason]. However, others felt that [opposing view], pointing out [counter-reason].

There was general agreement on [common ground]. The group also highlighted [additional important point].

In summary, the discussion revealed [overall conclusion or unresolved tension].`,
  },
};
