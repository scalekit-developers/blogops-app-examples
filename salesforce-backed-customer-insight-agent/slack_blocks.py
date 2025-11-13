from typing import List, Dict, Optional

# def header_block(text: str) -> Dict:
#     return {"type":"header","text":{"type":"plain_text","text":text}}

def section_mrkdwn(text: str) -> Dict:
    return {"type":"section","text":{"type":"mrkdwn","text":text}}

# def context_elems(texts: List[str]) -> Dict:
#     return {"type":"context","elements":[{"type":"mrkdwn","text":t} for t in texts]}

def divider() -> Dict:
    return {"type":"divider"}

def account_block(name: str, url: Optional[str], fields: List[str]) -> List[Dict]:
    title = f"*{name}*" + (f"  <{url}|Open>" if url else "")
    blocks: List[Dict] = [section_mrkdwn(title)]
    if fields:
        blocks.append(section_mrkdwn("\n".join(fields)))
    return blocks

def opp_line(name: str, url: Optional[str], stage: str, amount: str, close: str) -> str:
    link = f"<{url}|{name}>" if url else f"*{name}*"
    bits = [link]
    if stage: bits.append(f"`{stage}`")
    if amount: bits.append(f"${amount}")
    if close: bits.append(f"closes {close}")
    return " • " + "  |  ".join(bits)
