package storage

import (
	"context"
	"fmt"
	"io"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type S3Client struct {
	client *minio.Client
	bucket string
}

func NewS3Client(endpoint, accessKey, secretKey, bucket string, useSSL bool) (*S3Client, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("create minio client: %w", err)
	}

	return &S3Client{client: client, bucket: bucket}, nil
}

func (s *S3Client) EnsureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("check bucket: %w", err)
	}
	if !exists {
		if err := s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{}); err != nil {
			return fmt.Errorf("create bucket: %w", err)
		}
	}
	return nil
}

func (s *S3Client) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket, key, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("upload object: %w", err)
	}
	return nil
}

func (s *S3Client) Download(ctx context.Context, key string) (io.ReadCloser, error) {
	obj, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("get object: %w", err)
	}
	return obj, nil
}

func (s *S3Client) Delete(ctx context.Context, key string) error {
	err := s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("delete object: %w", err)
	}
	return nil
}

func (s *S3Client) Copy(ctx context.Context, srcKey, dstKey string) error {
	src := minio.CopySrcOptions{Bucket: s.bucket, Object: srcKey}
	dst := minio.CopyDestOptions{Bucket: s.bucket, Object: dstKey}
	_, err := s.client.CopyObject(ctx, dst, src)
	if err != nil {
		return fmt.Errorf("copy object: %w", err)
	}
	return nil
}
