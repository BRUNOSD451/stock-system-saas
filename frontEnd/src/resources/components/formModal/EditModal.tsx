import type { FormModalProps } from "./FormModal";
import FormModal from "./FormModal";

type EditModalProps = Omit<FormModalProps, "title"> & { title?: string };

export default function EditModal({ title = "Editar item", ...props }: EditModalProps) {
  return <FormModal {...props} title={title} />;
}
