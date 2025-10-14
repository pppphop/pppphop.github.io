.macro end
	li $v0,10
	syscall
.end_macro 

.macro getInt(%des)
	li $v0,5
	syscall 
	move %des,$v0
.end_macro 
	
.macro printInt(%src)
	move $a0,%src
	li $v0,1
	syscall 
.end_macro 

.macro printStr(%src)
	la $a0,%src
	li $v0,4
	syscall 
.end_macro 

.macro push(%src)
	addi $sp,$sp,-4
	sw %src 0($sp)
.end_macro 

.macro getIndex(%src1,%src2,%des)
	sll %des,%src1,2
	add %des,%des,%src2
	sll %des,%des,2
.end_macro 

.data
	a: .space 100
	space: .asciiz " "
	nxtline: .asciiz "\n"
	err: .asciiz "Out of bounds"

.text
li $s0,16
li $t0,0
for_in:
	beq $t0,$s0,for_in_end
	getInt($t1)
	sll $t2,$t0,2
	sw $t1 a($t2)
	addi $t0,$t0,1
	j for_in

for_in_end:
getInt($s1)					#s1=m
getInt($s2)					#s2=n
getInt($s3)					#s3=i
getInt($s4)					#s4=j

add $t4,$s1,$s3
add $t5,$s2,$s4
bgt $t4,4,error
bgt $t5,4,error

move $t0,$s3
for_i:
	beq $t0,$t4,for_i_end
	move $t1,$s4
	for_j:
		beq $t1,$t5,for_j_end
		getIndex($t0,$t1,$t2)
		lw $t3,a($t2)
		printInt($t3)
		printStr(space)
		addi $t1,$t1,1
		j for_j
	for_j_end:
		addi $t0,$t0,1
		printStr(nxtline)
		j for_i
for_i_end:
	end

error:
	printStr(err)
end
	
			
				
					
						
							
								
									
										
											
												
														