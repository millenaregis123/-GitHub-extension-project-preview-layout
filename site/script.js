/* TWM Engenharia — interações da landing page */
(function () {
  "use strict";

  // Ano atual no rodapé
  var ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();

  // Header com sombra ao rolar
  var header = document.querySelector(".site-header");
  var onScroll = function () {
    if (window.scrollY > 8) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Menu mobile
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");
  if (toggle && menu) {
    var closeMenu = function () {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  // Revelação ao rolar
  var reveals = document.querySelectorAll(
    ".card, .step, .testimonial, .about-content, .about-media, .section-head, .contact-form, .faq details, .stat"
  );
  reveals.forEach(function (el) {
    el.classList.add("reveal");
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("in");
    });
  }

  // Formulário de orçamento → abre WhatsApp com a mensagem preenchida
  var form = document.getElementById("orcamento-form");
  var note = document.getElementById("form-note");
  var WHATSAPP = "5599999999999"; // TODO: trocar pelo número real (DDI+DDD+número)

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = form.nome.value.trim();
      var tel = form.telefone.value.trim();
      if (!nome || !tel) {
        note.textContent = "Por favor, preencha ao menos o seu nome e telefone.";
        note.className = "form-note err";
        return;
      }
      var texto =
        "Olá, sou " + nome + " e gostaria de um orçamento com a TWM Engenharia.\n" +
        "Serviço: " + form.servico.value + "\n" +
        (form.email.value.trim() ? "E-mail: " + form.email.value.trim() + "\n" : "") +
        "Telefone: " + tel +
        (form.mensagem.value.trim() ? "\nProjeto: " + form.mensagem.value.trim() : "");

      var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto);
      window.open(url, "_blank", "noopener");

      note.textContent = "Redirecionando para o WhatsApp… se não abrir, chame-nos diretamente.";
      note.className = "form-note ok";
      form.reset();
    });
  }
})();
