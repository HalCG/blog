#!/usr/bin/env python3
"""Generate Sobel kernel diagram and VTK edge-detection result images for the blog."""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUTPUT_DIR = Path(__file__).resolve().parent


def save_kernel_diagram() -> Path:
    """Figure 1: Sobel outer-product decomposition (Dx, Sy, Gx)."""
    dx = np.array([[-1, 0, 1]])
    sy = np.array([[1], [2], [1]])
    gx = sy @ dx
    gy = dx.T @ sy.T

    fig, axes = plt.subplots(2, 3, figsize=(10, 6))
    fig.suptitle("Sobel Operator: Derivative x Smoothing (Outer Product)", fontsize=14)

    panels = [
        (axes[0, 0], dx, r"$D_x = [-1,\ 0,\ 1]$ (x derivative)"),
        (axes[0, 1], sy, r"$S_y = [1,\ 2,\ 1]^T$ (y smoothing)"),
        (axes[0, 2], gx, r"$G_x = S_y \otimes D_x$"),
        (axes[1, 0], sy.T, r"$S_x = [1,\ 2,\ 1]$ (x smoothing)"),
        (axes[1, 1], dx.T, r"$D_y = [-1,\ 0,\ 1]^T$ (y derivative)"),
        (axes[1, 2], gy, r"$G_y = S_x \otimes D_y$"),
    ]

    for ax, matrix, title in panels:
        im = ax.imshow(matrix, cmap="RdBu_r", vmin=-2, vmax=2)
        ax.set_title(title, fontsize=10)
        for (row, col), value in np.ndenumerate(matrix):
            ax.text(col, row, f"{int(value)}", ha="center", va="center", color="black", fontsize=12)
        ax.set_xticks([])
        ax.set_yticks([])
        fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)

    out = OUTPUT_DIR / "sobel_kernels.png"
    fig.tight_layout()
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return out


def save_vtk_results() -> Path:
    """Figure 2: Original image, Gx, Gy, and gradient magnitude via VTK."""
    import vtkmodules.vtkRenderingOpenGL2  # noqa: F401
    from vtkmodules.util.numpy_support import vtk_to_numpy
    from vtkmodules.vtkCommonDataModel import vtkImageData
    from vtkmodules.vtkImagingCore import vtkImageExtractComponents
    from vtkmodules.vtkImagingGeneral import vtkImageConvolve, vtkImageSobel2D
    from vtkmodules.vtkImagingMath import vtkImageMathematics
    from vtkmodules.vtkImagingSources import vtkImageCanvasSource2D

    source = vtkImageCanvasSource2D(extent=(0, 199, 0, 199, 0, 0))
    source.SetScalarTypeToUnsignedChar()
    source.draw_color = (0, 0, 0)
    source.FillBox(0, 199, 0, 199)
    source.draw_color = (255, 255, 255)
    source.FillBox(40, 80, 40, 160)
    source.FillBox(120, 160, 60, 140)
    source.draw_color = (180, 180, 180)
    source.FillCircle(100, 100, 25)
    source.Update()

    sobel = vtkImageSobel2D()
    sobel.SetInputConnection(source.GetOutputPort())
    sobel.Update()

    extract_x = vtkImageExtractComponents()
    extract_x.SetInputConnection(sobel.GetOutputPort())
    extract_x.SetComponents(0)
    extract_x.Update()

    extract_y = vtkImageExtractComponents()
    extract_y.SetInputConnection(sobel.GetOutputPort())
    extract_y.SetComponents(1)
    extract_y.Update()

    square_x = vtkImageMathematics()
    square_x.SetOperationToMultiply()
    square_x.SetInputConnection(0, extract_x.GetOutputPort())
    square_x.SetInputConnection(1, extract_x.GetOutputPort())
    square_x.Update()

    square_y = vtkImageMathematics()
    square_y.SetOperationToMultiply()
    square_y.SetInputConnection(0, extract_y.GetOutputPort())
    square_y.SetInputConnection(1, extract_y.GetOutputPort())
    square_y.Update()

    sum_sq = vtkImageMathematics()
    sum_sq.SetOperationToAdd()
    sum_sq.SetInputConnection(0, square_x.GetOutputPort())
    sum_sq.SetInputConnection(1, square_y.GetOutputPort())
    sum_sq.Update()

    magnitude = vtkImageMathematics()
    magnitude.SetOperationToSquareRoot()
    magnitude.SetInputConnection(sum_sq.GetOutputPort())
    magnitude.Update()

    gx_kernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
    convolve_x = vtkImageConvolve()
    convolve_x.SetInputConnection(source.GetOutputPort())
    convolve_x.SetKernel3x3(gx_kernel)
    convolve_x.Update()

    def to_gray_array(image: vtkImageData) -> np.ndarray:
        dims = image.GetDimensions()
        scalars = image.GetPointData().GetScalars()
        arr = vtk_to_numpy(scalars).reshape(dims[1], dims[0])
        arr = np.abs(arr.astype(np.float64))
        if arr.max() > 0:
            arr = arr / arr.max()
        return arr

    original = to_gray_array(source.GetOutput())
    gx = to_gray_array(extract_x.GetOutput())
    gy = to_gray_array(extract_y.GetOutput())
    grad = to_gray_array(magnitude.GetOutput())
    gx_manual = to_gray_array(convolve_x.GetOutput())

    fig, axes = plt.subplots(2, 3, figsize=(12, 8))
    fig.suptitle("VTK Sobel Edge Detection Pipeline", fontsize=14)

    images = [
        (original, "Original"),
        (gx, r"$|G_x|$ (vtkImageSobel2D)"),
        (gy, r"$|G_y|$ (vtkImageSobel2D)"),
        (grad, r"$|\nabla f| = \sqrt{G_x^2 + G_y^2}$"),
        (gx_manual, r"$G_x$ (vtkImageConvolve manual kernel)"),
        (np.abs(gx - gx_manual), r"$|G_x^{sobel} - G_x^{convolve}|$"),
    ]

    for ax, data, title in zip(axes.flat, images, [t for _, t in images]):
        ax.imshow(data, cmap="gray", vmin=0, vmax=1)
        ax.set_title(title, fontsize=10)
        ax.axis("off")

    out = OUTPUT_DIR / "sobel_vtk_result.png"
    fig.tight_layout()
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return out


def main() -> None:
    kernel_path = save_kernel_diagram()
    print(f"Saved: {kernel_path}")
    result_path = save_vtk_results()
    print(f"Saved: {result_path}")


if __name__ == "__main__":
    main()
