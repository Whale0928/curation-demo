// data-page 속성 기반으로 현재 페이지 nav 항목에 active 클래스 부여.
const page = document.body.dataset.page;
if (page) {
  document.querySelectorAll(`.topbar nav a[data-page="${page}"]`)
    .forEach(a => a.classList.add('active'));
}
