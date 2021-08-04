<template>
  <VueScriptSetup animal="Dog"></VueScriptSetup>
</template>

<script lang="ts">
import VueScriptSetup from "./VueScriptSetup.vue";
import { defineComponent } from "vue";

interface Props {
  person: string;
}
export default defineComponent({
  components: { VueScriptSetup },

  props: {
    person: { type: String, default: "tom" },
  },

  setup(props: Props) {
    return {};
  },
});
</script>
