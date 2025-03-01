<script>
import { h } from 'vue';
import components from '.';

export default {
  props: ['msg'],

  render(props) {
    const attachments = [];
    const attachNames = Object.keys(props.msg.attachments);
    // Вложения, с которыми не будут отображаться другие вложения (будут скрыты)
    const singleAttachments = ['sticker', 'gift'];
    const hasSingleAttach = singleAttachments.some((attach) => attachNames.includes(attach));

    const layoutAttaches = {};
    const documentAttaches = [];

    for (const type in props.msg.attachments) {
      const attach = props.msg.attachments[type];
      const component = components[type];

      if (hasSingleAttach && !singleAttachments.includes(type)) {
        continue;
      }

      if (['photo', 'video', 'doc'].includes(type)) {
        if (type === 'doc') {
          const photoDocs = [];

          for (const doc of attach) {
            if (doc.preview && doc.preview.photo) {
              photoDocs.push(doc);
            } else {
              documentAttaches.push(doc);
            }
          }

          if (photoDocs.length) {
            layoutAttaches.doc = photoDocs;
          }
        } else {
          layoutAttaches[type] = attach;
        }
      } else if (component) {
        attachments.push(
          h(component, {
            key: attach,
            attach,
            msg: props.msg
          })
        );
      } else {
        attachments.push(
          h('div', { class: 'im_attach_unknown' }, `(${type})`)
        );
      }
    }

    if (Object.keys(layoutAttaches).length) {
      attachments.unshift(
        // key не нужен, так как содержимое автоматически обновляется
        // используя render-функции
        h(components.photosLayout, {
          attachments: layoutAttaches
        })
      );
    }

    if (documentAttaches.length) {
      attachments.push(
        ...documentAttaches.map((attach) => (
          h(components.doc, {
            key: attach,
            attach
          })
        ))
      );
    }

    if (attachments.length) {
      return h('div', { class: 'im_attachments' }, attachments);
    }
  }
};
</script>

<style>
.im_attach_unknown {
  color: var(--text-dark-steel-gray);
}

.im_attachments {
  user-select: none;
}

.im_attachments > div:not(:first-child) {
  margin-top: 5px;
}

.im_attachments > div:not(:first-child).attach_doc {
  margin-top: 8px;
}

/* Убираем слишком большой отступ от конца сообщения */
.message:not(.hasForward) .message_bubble_content > .im_attachments > .im_attach_unknown:last-child,
.message:not(.hasForward) .message_bubble_content > .im_attachments > .attach_doc:last-child,
.message:not(.hasForward) .message_bubble_content > .im_attachments > .attach_link:last-child,
.message:not(.hasForward) .message_bubble_content > .im_attachments > .attach_wall:last-child {
  margin-bottom: -5px;
}

/* stylelint-disable selector-combinator-space-before */
.message.hasPhoto .message_bubble_content > .attach_forwarded,
.message.hasPhoto .message_bubble_content > .im_attachments
> div:not(.attach_photos_wrap):not(.attach_link:not(.-short)) {
  margin-left: 5px;
  margin-right: 5px;
}
/* stylelint-enable selector-combinator-space-before */

.attach_left_border::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  border-radius: 1px;
  background: var(--attach-left-border);
}

.attach_title {
  font-size: 13px;
  margin-bottom: 4px;
  color: var(--text-dark-steel-gray);
}

.outline_button {
  color: var(--text-light-blue);
  border: 1px solid var(--accent);
  border-radius: 8px;
  padding: 3px 16px;
  margin-top: 6px;
  font-size: 13px;
  line-height: 18px;
  text-align: center;
  cursor: pointer;
}
</style>
