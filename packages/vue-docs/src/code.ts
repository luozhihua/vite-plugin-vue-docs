export function createContentCode(): string | null {
  return `<template>
  <section>
    <h1>{{ content.name }}</h1>
    <template v-for="type in ['props', 'emits', 'methods']" :key="type">
      <div class="card" v-if="content[type]">
        <h3>{{ content[type].h3 }}</h3>
        <table>
          <thead>
            <tr>
              <th
                v-for="(item, index) in content[type].table.headers"
                :key="index"
              >
                {{ item }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in content[type].table.rows" :key="i">
              <td v-for="(v, k) in item" :key="k">
                <!-- 类型 -->
                <em v-if="type === 'props' && k === 2">{{ v }}</em>
                <!-- 必填 -->
                <code v-else-if="type === 'props' && k === 4">{{ v }}</code>
                <span v-else>{{ v }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<script>
export default {
  name: "CustomContent",
  props: {
    content: Object,
  },
};
</script>
`;
}