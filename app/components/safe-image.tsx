import React, { useState, useEffect } from "react";

interface SafeImageProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  fallback?: string;
  onError?: () => void;
  onLoad?: () => void;
}

export function SafeImage({
  src,
  alt = "",
  className,
  width,
  height,
  fallback = "/placeholder-image.png",
  onError,
}: SafeImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // 构建代理URL - 使用相对路径避免baseUrl问题
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
    setImageSrc(proxyUrl);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImageSrc(fallback);
      onError?.();
    }
  };

  const handleLoad = () => {
    setHasError(false);
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onError={handleError}
      onLoad={handleLoad}
      loading="lazy"
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
    />
  );
}

// 图片加载状态组件
export function ImageWithLoader({
  src,
  alt,
  className,
  width,
  height,
}: SafeImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="image-container" style={{ position: "relative" }}>
      {isLoading && !hasError && (
        <div
          className="image-loader"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f0f0f0",
          }}
        >
          加载中...
        </div>
      )}
      {hasError && (
        <div
          className="image-error"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f5f5f5",
            color: "#999",
          }}
        >
          图片加载失败
        </div>
      )}
      <SafeImage
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        onError={() => setHasError(true)}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
