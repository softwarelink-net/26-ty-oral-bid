<template>
  <div class="auth-layout min-h-screen relative overflow-hidden">
    <div class="wave-layer" aria-hidden="true" />
    <div class="relative z-10 flex flex-col min-h-[calc(100vh-40px)]">
      <header class="px-6 py-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
            十八
          </div>
          <div>
            <p class="font-display text-lg text-white tracking-wide">太原市第十八中学校</p>
            <p class="text-xs text-cyan-200/80">外语听说模考数智化管控中枢 · 1401992026AGK00696</p>
          </div>
        </div>
        <nav class="flex gap-4 text-sm">
          <RouterLink to="/tender" class="text-cyan-100 hover:text-white transition">招标公告</RouterLink>
          <RouterLink to="/login" class="text-cyan-100 hover:text-white transition">登录控制台</RouterLink>
        </nav>
      </header>
      <main class="flex-1 flex items-center justify-center px-4 pb-12">
        <slot />
      </main>
      <footer class="text-center text-xs text-indigo-200/60 pb-6">
        纯前端 WebAssembly sql.js 边缘运行 · 演示数据仅供技术研究参考
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.auth-layout {
  background:
    radial-gradient(ellipse at 20% 20%, rgba(6, 182, 212, 0.18), transparent 50%),
    radial-gradient(ellipse at 80% 0%, rgba(99, 102, 241, 0.25), transparent 45%),
    linear-gradient(160deg, #0f172a 0%, #1e1b4b 45%, #0c4a6e 100%);
}
.wave-layer {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 40px,
    rgba(34, 211, 238, 0.03) 40px,
    rgba(34, 211, 238, 0.03) 41px
  );
  mask-image: linear-gradient(180deg, transparent, black 30%, black 70%, transparent);
  pointer-events: none;
}
.wave-layer::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 35%;
  height: 120px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,60 C150,100 350,20 600,60 C850,100 1050,20 1200,60 L1200,120 L0,120 Z' fill='rgba(34,211,238,0.08)'/%3E%3C/svg%3E")
    center / cover no-repeat;
  animation: waveDrift 12s ease-in-out infinite alternate;
}
@keyframes waveDrift {
  from { transform: translateX(-2%); }
  to { transform: translateX(2%); }
}
</style>
