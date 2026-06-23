import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { resolveApiUrl } from '@/Auth/authApi';
import styles from './Styles.module.scss';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const MarkdownContentComponent = ({ content, className }: MarkdownContentProps) => {
  return (
    <div className={className ? `${styles.markdown} ${className}` : styles.markdown}>
      <ReactMarkdown
        components={{
          img: ({ src, alt }) => (
            <img src={typeof src === 'string' ? resolveApiUrl(src) : src} alt={alt ?? ''} />
          ),
          video: ({ src, ...props }) => (
            <video src={typeof src === 'string' ? resolveApiUrl(src) : src} controls {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const MarkdownContent = memo(MarkdownContentComponent);