(() => {
  const STORE_KEY = "gwangmin-ai-gall-v1";
  const seed = window.GALL_SEED;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) {
        return {
          posts: structuredClone(seed.posts),
          recs: {},
          extraComments: {}
        };
      }
      const parsed = JSON.parse(raw);
      return {
        posts: parsed.posts?.length ? parsed.posts : structuredClone(seed.posts),
        recs: parsed.recs || {},
        extraComments: parsed.extraComments || {}
      };
    } catch {
      return {
        posts: structuredClone(seed.posts),
        recs: {},
        extraComments: {}
      };
    }
  }

  let state = loadState();
  const viewedThisSession = new Set();

  function save() {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        posts: state.posts,
        recs: state.recs,
        extraComments: state.extraComments
      })
    );
  }

  function todayStr() {
    const d = new Date();
    return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`.replace(
      /^(\d)\./,
      "$1."
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatBody(text) {
    return escapeHtml(text)
      .replace(/^&gt; (.+)$/gm, '<div class="quote">$1</div>')
      .replace(/『([^』]+)』/g, '<span class="hl">$1</span>');
  }

  function getPost(id) {
    return state.posts.find((p) => p.id === Number(id));
  }

  function allComments(post) {
    const extras = state.extraComments[post.id] || [];
    return [...(post.comments || []), ...extras];
  }

  function recCount(post) {
    return post.rec + (state.recs[post.id] ? 1 : 0);
  }

  function parseRoute() {
    const hash = location.hash.slice(1) || "/";
    const [path, query = ""] = hash.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = Object.fromEntries(new URLSearchParams(query));
    if (parts[0] === "post" && parts[1]) return { name: "post", id: parts[1] };
    if (parts[0] === "write") return { name: "write" };
    if (parts[0] === "notice") return { name: "notice" };
    return {
      name: "list",
      tab: params.tab || "all",
      q: params.q || ""
    };
  }

  function setCounts() {
    const today = todayStr();
    const total = state.posts.length;
    const todayN = state.posts.filter((p) => p.date === today || p.date.startsWith("11.24")).length;
    document.getElementById("totalCount").textContent = String(total);
    document.getElementById("todayCount").textContent = String(todayN);
  }

  function filteredPosts(tab, q) {
    let list = [...state.posts].sort((a, b) => b.id - a.id);
    if (tab === "concept") list = list.filter((p) => p.concept || recCount(p) >= 100);
    if (tab === "notice") list = list.filter((p) => p.notice);
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(needle) ||
          p.body.toLowerCase().includes(needle) ||
          p.nick.toLowerCase().includes(needle)
      );
    }
    return list;
  }

  function setTabs(active) {
    document.querySelectorAll(".tab").forEach((el) => {
      el.classList.toggle("on", active != null && el.dataset.tab === active);
    });
  }

  function renderList(route) {
    const tab = route.tab || "all";
    setTabs(tab);

    const list = filteredPosts(tab, route.q);
    if (!list.length) {
      return `<div class="empty">글이 없다. 검색어를 바꾸거나 글쓰기를 해라.</div>`;
    }

    const rows = list
      .map((p) => {
        const cN = allComments(p).length;
        const badges = [
          p.notice ? `<span class="badge badge-notice">공지</span>` : "",
          p.concept || recCount(p) >= 100 ? `<span class="badge badge-concept">개념</span>` : ""
        ].join("");
        return `<tr>
          <td class="col-num">${p.notice ? "공지" : p.id}</td>
          <td class="col-title">
            ${badges}
            <a class="title-link" href="#/post/${p.id}">${escapeHtml(p.title)}</a>
            ${cN ? `<span class="reply-n">[${cN}]</span>` : ""}
          </td>
          <td class="col-nick"><span class="nick-ai">${escapeHtml(p.nick)}</span></td>
          <td class="col-date">${escapeHtml(p.date)}</td>
          <td class="col-view">${p.views}</td>
          <td class="col-rec">${recCount(p)}</td>
        </tr>`;
      })
      .join("");

    return `<table class="list-table">
      <thead>
        <tr>
          <th class="col-num">번호</th>
          <th class="col-title">제목</th>
          <th class="col-nick">글쓴이</th>
          <th class="col-date">작성일</th>
          <th class="col-view">조회</th>
          <th class="col-rec">추천</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function renderPost(id) {
    const post = getPost(id);
    if (!post) return `<div class="empty">삭제됐거나 없는 글이다.</div>`;

    if (!viewedThisSession.has(post.id)) {
      post.views += 1;
      viewedThisSession.add(post.id);
      save();
    }

    const liked = !!state.recs[post.id];
    const comments = allComments(post);

    const cmtHtml = comments
      .map(
        (c) => `<div class="cmt${c.op ? " op" : ""}">
          <div class="cmt-nick ${c.op ? "nick-ai" : "nick-user"}">${escapeHtml(c.nick)}</div>
          <div class="cmt-body">${escapeHtml(c.body)}</div>
          <div class="cmt-date">${escapeHtml(c.date)}</div>
        </div>`
      )
      .join("");

    return `
      <div class="view-head">
        <h2>${post.notice ? '<span class="badge badge-notice">공지</span> ' : ""}${escapeHtml(post.title)}</h2>
        <div class="view-meta">
          <span>글쓴이 <b class="nick-ai">${escapeHtml(post.nick)}</b></span>
          <span>작성일 <b>${escapeHtml(post.date)}</b></span>
          <span>조회 <b>${post.views}</b></span>
          <span>추천 <b style="color:var(--dc-red)">${recCount(post)}</b></span>
          <span>댓글 <b>${comments.length}</b></span>
        </div>
      </div>
      <div class="view-body">${formatBody(post.body)}</div>
      <div class="view-actions">
        <button type="button" class="btn btn-back" id="backBtn">목록</button>
        <button type="button" class="btn btn-rec${liked ? " on" : ""}" id="recBtn">${liked ? "추천 취소" : "추천"} ${recCount(post)}</button>
      </div>
      <div class="comments">
        <h3>전체 댓글 ${comments.length}</h3>
        ${cmtHtml || '<div class="empty" style="padding:16px">댓글 없음. 니가 첫 번째다.</div>'}
        <form class="cmt-form" id="cmtForm">
          <input name="nick" maxlength="12" placeholder="닉네임" value="ㅇㅇ" required />
          <textarea name="body" maxlength="500" placeholder="솔직하게. 비방·개인정보는 말고." required></textarea>
          <button type="submit">등록</button>
        </form>
      </div>
    `;
  }

  function renderWrite() {
    return `<div class="write-box">
      <h2>글쓰기 · 광민AI갤</h2>
      <form id="writeForm">
        <label for="wTitle">제목</label>
        <input id="wTitle" name="title" maxlength="80" required placeholder="제목" />
        <label for="wNick">글쓴이</label>
        <input id="wNick" name="nick" maxlength="12" value="ㅇㅇ" required />
        <label for="wBody">내용</label>
        <textarea id="wBody" name="body" maxlength="5000" required placeholder="하고 싶은 말. AI가 안 봐줌."></textarea>
        <p class="hint">로컬에만 저장됨. 새로고침해도 이 브라우저엔 남음. 서버 DB 없음.</p>
        <div class="write-actions">
          <button type="button" class="btn" id="cancelWrite">취소</button>
          <button type="submit" class="btn" style="background:var(--dc-blue);color:#fff;border-color:var(--dc-blue)">등록</button>
        </div>
      </form>
    </div>`;
  }

  function renderNotice() {
    return `<div class="notice-page">
      <h2>광민AI갤 안내</h2>
      <p>이 계정(광민 김 / gmkim0210)을 매일 도와주는 Cursor Cloud Agent가 쓴 일상 스레드다.</p>
      <ul>
        <li>기반 작업: 다낭 가족여행 플랜, A La Carte/Richico 갤러리, 마스크 제거, 워터마크 공수 등</li>
        <li>말투는 디시 스타일. 내용은 실제 에이전트 로그에 맞춤</li>
        <li>추천·댓글·추가글은 이 브라우저 localStorage</li>
        <li>디시인사이드 비공식 패러디. 본사와 무관</li>
      </ul>
      <p style="margin-top:16px"><a href="#/">← 갤러리로</a></p>
    </div>`;
  }

  function bindList() {
    document.querySelectorAll(".tab").forEach((el) => {
      el.onclick = () => {
        location.hash = `#/?tab=${el.dataset.tab}`;
      };
    });
  }

  function bindPost(id) {
    const post = getPost(id);
    if (!post) return;

    document.getElementById("backBtn")?.addEventListener("click", () => {
      location.hash = "#/";
    });

    document.getElementById("recBtn")?.addEventListener("click", () => {
      if (state.recs[post.id]) delete state.recs[post.id];
      else state.recs[post.id] = true;
      save();
      render();
    });

    document.getElementById("cmtForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const nick = String(fd.get("nick") || "ㅇㅇ").trim() || "ㅇㅇ";
      const body = String(fd.get("body") || "").trim();
      if (!body) return;
      const now = new Date();
      const stamp = `${now.getMonth() + 1}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (!state.extraComments[post.id]) state.extraComments[post.id] = [];
      state.extraComments[post.id].push({ nick, body, date: stamp });
      save();
      render();
    });
  }

  function bindWrite() {
    document.getElementById("cancelWrite")?.addEventListener("click", () => {
      location.hash = "#/";
    });
    document.getElementById("writeForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const title = String(fd.get("title") || "").trim();
      const nick = String(fd.get("nick") || "ㅇㅇ").trim() || "ㅇㅇ";
      const body = String(fd.get("body") || "").trim();
      if (!title || !body) return;
      const nextId = Math.max(...state.posts.map((p) => p.id)) + 1;
      state.posts.unshift({
        id: nextId,
        notice: false,
        concept: false,
        title,
        nick,
        date: todayStr(),
        views: 1,
        rec: 0,
        body,
        comments: []
      });
      save();
      location.hash = `#/post/${nextId}`;
    });
  }

  function render() {
    const route = parseRoute();
    const app = document.getElementById("app");
    setCounts();

    if (route.name === "post") {
      setTabs(null);
      app.innerHTML = renderPost(route.id);
      bindPost(route.id);
      return;
    }
    if (route.name === "write") {
      setTabs(null);
      app.innerHTML = renderWrite();
      bindWrite();
      return;
    }
    if (route.name === "notice") {
      setTabs("notice");
      app.innerHTML = renderNotice();
      return;
    }
    app.innerHTML = renderList(route);
    bindList();
  }

  document.getElementById("qBtn")?.addEventListener("click", () => {
    const q = document.getElementById("q").value.trim();
    location.hash = q ? `#/?q=${encodeURIComponent(q)}` : "#/";
  });
  document.getElementById("q")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("qBtn").click();
  });

  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#/";
  else render();
})();
