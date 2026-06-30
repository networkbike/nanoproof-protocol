# LlamaIndex Integration

> Planned for Phase 8 (Protocol SDK). This document describes the target integration shape.

---

## Install (planned)

```bash
pip install nanoproof-llamaindex nanoproof-sdk
```

## Wire into your agent (planned)

```python
from llama_index.agent.openai import OpenAIAgent
from nanoproof.llamaindex import NanoProofCallback

agent = OpenAIAgent.from_tools(tools, llm=llm, callbacks=[
    NanoProofCallback(
        api_key=os.environ["NANOPROOF_API_KEY"],
        network="arc-testnet",
        payout_policy={"max_per_response": 0.05, "max_per_day": 1.00},
    )
])

response = agent.chat(user_prompt)
print(response.response["nano_proof"]["receipts"])
```

---

## See also

- [`vercel-ai-sdk.md`](./vercel-ai-sdk.md)
- [`langchain.md`](./langchain.md)