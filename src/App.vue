<template>
  <main class="weather-app weather-app--main">
    <div class="weather-app__container">
      <h1 class="weather-app__title">Weather App</h1>
      <div class="weather-app__content">
        <router-view />
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
@use '@/styles/globals' as *;

.weather-app {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: $spacing-lg;

  &--main {
    background: transparent;
  }

  &__container {
    max-width: 720px;
    width: 100%;
    margin: 0 auto;
  }

  &__title {
    color: $text-white;
    font-weight: $font-weight-bold;
    font-size: $font-size-2xl;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    margin-bottom: $spacing-lg;
    text-align: center;
  }

  &__content {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .weather-app {
    padding: $spacing-md;

    &__title {
      font-size: $font-size-xl;
      margin-bottom: $spacing-md;
    }
  }
}

@media (max-width: 576px) {
  .weather-app {
    padding: $spacing-sm;

    &__title {
      font-size: $font-size-lg;
    }
  }
}
</style>
