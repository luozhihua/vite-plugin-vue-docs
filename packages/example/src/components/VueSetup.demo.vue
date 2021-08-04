<template>
  <VueSetup person="Cat"></VueSetup>
</template>

<script lang="ts">
import VueSetup from "./VueSetup.vue";
import { defineComponent } from "vue";

interface Props {
  person: string;
}
export default defineComponent({
  components: { VueSetup },

  props: {
    person: { type: String, default: "tom" },
  },

  setup(props: Props) {
    return {};
  },
});
</script>
