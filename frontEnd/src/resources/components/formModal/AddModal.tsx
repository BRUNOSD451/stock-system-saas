import type { FormModalProps } from "./FormModal";
import FormModal from "./FormModal";

type AddModalProps = Omit<FormModalProps, "title"> & { title?: string };

export default function AddModal({ title = "Adicionar item", ...props }: AddModalProps) {
  return <FormModal {...props} title={title} />;
}
