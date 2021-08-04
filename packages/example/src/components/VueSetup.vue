<template>
  <div>Hello {{ person }}</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

interface Props {
  person: string;
}
export default defineComponent({
  props: {
    person: { type: String, default: "tom" },
  },

  setup(props: Props) {
    return {};
  },
});
</script>
