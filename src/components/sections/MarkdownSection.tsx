'use client';

import { Children, isValidElement, useMemo, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import CodeBlock from './markdown/CodeBlock';
import Callout from './markdown/Callout';
import ImageModal from '@/components/common/ImageModal';

interface MarkdownSectionProps {
  content: string;
  accentColor: string;
}

// blockquote 자식에서 텍스트 추출
const extractText = (node: ReactNode): string => {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!isValidElement(node)) return '';
  const children = (node.props as { children?: ReactNode }).children;
  if (!children) return '';
  return Children.toArray(children).map(extractText).join('');
};

// [!TYPE] 패턴으로 callout 타입 감지
const CALLOUT_REGEX = /^\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*/;

type CalloutType = 'NOTE' | 'TIP' | 'WARNING' | 'IMPORTANT';

// heading factory — h1~h4의 반복 패턴 제거
const createHeading = (
  Tag: 'h1' | 'h2' | 'h3' | 'h4',
  className: string,
  fontSize: string,
  fontWeight: number,
): Components[typeof Tag] =>
  ({ children, id }) => (
    <Tag
      id={id}
      className={className}
      style={{ color: 'var(--text-primary)', fontWeight, fontSize, lineHeight: 1.3 }}
    >
      {children}
    </Tag>
  );

const MarkdownSection = ({ content, accentColor }: MarkdownSectionProps) => {
  const components: Components = useMemo(() => ({
    // --- Headings (Notion 스타일) ---
    h1: createHeading('h1', 'mt-2 mb-4 first:mt-0', '1.875em', 700),
    h2: createHeading('h2', 'mt-10 mb-4 first:mt-0', '1.5em', 600),
    h3: createHeading('h3', 'mt-6 mb-3', '1.25em', 600),
    h4: createHeading('h4', 'mt-4 mb-2', '1em', 600),

    // --- Text ---
    p: ({ children }) => (
      <p className="mb-4 text-[15px] leading-[1.8]" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic" style={{ color: 'var(--text-secondary)' }}>{children}</em>
    ),
    del: ({ children }) => (
      <del className="line-through" style={{ color: 'var(--text-muted)' }}>{children}</del>
    ),

    // --- Lists ---
    ul: ({ children }) => (
      <ul className="mb-2 list-disc space-y-0.5 pl-6">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-2 list-decimal space-y-0.5 pl-6">{children}</ol>
    ),
    li: ({ children, node }) => {
      // task-list-item 감지 (GFM 체크박스)
      const isTaskItem = node?.properties?.className
        && Array.isArray(node.properties.className)
        && node.properties.className.includes('task-list-item');

      if (isTaskItem) {
        return (
          <li
            className="flex list-none items-start gap-2 text-[15px] leading-[1.8]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {children}
          </li>
        );
      }

      return (
        <li
          className="text-[15px] leading-[1.8]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {children}
        </li>
      );
    },

    // --- Checkbox (GFM task list) ---
    input: ({ checked, type, ...props }) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mt-1.5 h-4 w-4 shrink-0 cursor-default rounded"
            style={{ accentColor }}
            {...props}
          />
        );
      }
      return <input type={type} {...props} />;
    },

    // --- Links ---
    a: ({ href, children }) => {
      // 이미지 확장자 링크 → 모달로 표시
      if (href && /\.(jpg|jpeg|png|webp|gif|svg|pdf)$/i.test(href)) {
        return (
          <ImageModal src={href} alt={typeof children === 'string' ? children : ''}>
            {children}
          </ImageModal>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[15px] underline underline-offset-2 transition-opacity hover:opacity-75"
          style={{ color: 'var(--link-color)' }}
        >
          {children}
        </a>
      );
    },

    // --- Divider ---
    hr: () => (
      <hr className="my-8" style={{ borderColor: 'var(--hr-color)' }} />
    ),

    // --- Code ---
    code: ({ children, className }) => {
      // 코드 블록: language-* 클래스가 있으면 CodeBlock으로 렌더
      const match = className?.match(/language-(\w+)/);
      if (match) {
        const code = String(children).replace(/\n$/, '');
        return <CodeBlock code={code} language={match[1]} />;
      }

      // 인라인 코드
      return (
        <code
          className="border-warm rounded-md px-1.5 py-0.5 text-[13px]"
          style={{
            backgroundColor: 'var(--kraft-light)',
            color: 'var(--text-primary)',
          }}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => {
      // pre 태그는 CodeBlock 내부에서 자체 처리하므로 children만 전달
      return <>{children}</>;
    },

    // --- Blockquote / Callout ---
    blockquote: ({ children }) => {
      // 자식 요소에서 텍스트를 추출하여 [!TYPE] 패턴 체크
      const childArray = Children.toArray(children);
      const firstChild = childArray.find((child) => isValidElement(child));
      if (firstChild && isValidElement(firstChild)) {
        const text = extractText(firstChild);
        const calloutMatch = text.match(CALLOUT_REGEX);
        if (calloutMatch) {
          const type = calloutMatch[1] as CalloutType;
          // [!TYPE] 패턴을 제거한 나머지 텍스트를 content로 사용
          const cleanedText = text.replace(CALLOUT_REGEX, '');
          const restChildren = childArray.filter((child) => child !== firstChild);

          return (
            <Callout type={type}>
              {cleanedText && (
                <p className="mb-2 text-[14px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>
                  {cleanedText}
                </p>
              )}
              {restChildren}
            </Callout>
          );
        }
      }

      // 일반 blockquote
      return (
        <blockquote
          className="my-4 rounded-r-lg py-2 pr-4 pl-4"
          style={{
            borderLeftWidth: '3px',
            borderLeftStyle: 'solid',
            borderLeftColor: accentColor,
            backgroundColor: 'var(--blockquote-bg)',
          }}
        >
          {children}
        </blockquote>
      );
    },

    // --- Table (GFM) ---
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto">
        <table className="border-warm w-full rounded-lg text-[14px]">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead style={{ backgroundColor: 'var(--kraft-light)' }}>{children}</thead>
    ),
    th: ({ children }) => (
      <th
        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
        style={{
          color: 'var(--text-muted)',
          borderBottomWidth: '2px',
          borderBottomStyle: 'solid',
          borderBottomColor: 'var(--border-warm)',
        }}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        className="px-4 py-2.5 text-[14px]"
        style={{
          color: 'var(--text-secondary)',
          borderBottomWidth: '1px',
          borderBottomStyle: 'solid',
          borderBottomColor: 'var(--border-warm)',
        }}
      >
        {children}
      </td>
    ),

    // --- Toggle (details/summary) ---
    details: ({ children, ...props }) => (
      <details
        className="border-warm my-3 rounded-lg"
        style={{
          backgroundColor: 'var(--kraft-light)',
        }}
        {...props}
      >
        {children}
      </details>
    ),
    summary: ({ children, ...props }) => (
      <summary
        className="cursor-pointer px-4 py-3 text-[15px] font-medium select-none"
        style={{ color: 'var(--text-primary)' }}
        {...props}
      >
        {children}
      </summary>
    ),

    // --- Image ---
    img: ({ src, alt }) => (
      <img
        src={src}
        alt={alt || ''}
        className="border-warm my-4 max-w-full rounded-lg"
      />
    ),
  }), [accentColor]);

  return (
    <div>
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={components}
      >
        {content}
      </Markdown>
    </div>
  );
};

export default MarkdownSection;
